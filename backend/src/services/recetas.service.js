import { Op, fn, col, where } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ProductoVenta, VarianteProducto, CategoriaVenta, RecetaBom, InsumoAlmacen, UnidadMedida,
  ModificadorBom, ModificadorItem, ModificadorCatalogo, ProductoModificador } from '../models/index.js';
import { esIdRecetaValido, validarVinculoReceta, validarRecetaCompleta, validarDeltaReceta, validarResolucionReceta } from '../validators/recetas.js';
import { unidadCanonica, unidadesCompatibles, convertirCantidadBase, cantidadEscalada, formatearCantidad,
  congelarSnapshotReceta, MAX_CANTIDAD_ESCALADA } from './recetas-calculo.js';

class ErrorReceta extends Error { constructor(estado) { super(estado); this.estado = estado; } }
const exigir = (condicion, estado) => { if (!condicion) throw new ErrorReceta(estado); };
const CAMPOS_BOM = ['id', 'producto_venta_id', 'variante_id', 'insumo_id', 'cantidad_bruta_necesaria', 'porcentaje_merma_esperado'];

async function ejecutar(operacion, transaction) {
  try {
    return transaction ? await operacion(transaction) : await sequelize.transaction(operacion);
  } catch (error) {
    if (error instanceof ErrorReceta) return { estado: error.estado };
    throw error;
  }
}

async function productoPreparado(productoId, varianteId, transaction, produccion = false) {
  exigir(esIdRecetaValido(productoId) && (varianteId === null || esIdRecetaValido(varianteId)), 'datos_invalidos');
  // Mismo orden de bloqueo que catálogo: producto antes de variante y grupos.
  const producto = await ProductoVenta.findByPk(productoId, {
    attributes: ['id', 'nombre', 'tipo_producto', 'estado', 'categoria_id'], transaction, lock: transaction.LOCK.UPDATE
  });
  exigir(producto, 'producto_inexistente');
  exigir(producto.tipo_producto === 'plato_preparado', 'producto_no_preparado');
  if (produccion) {
    const categoria = await CategoriaVenta.findByPk(producto.categoria_id, { attributes: ['id', 'activa'], transaction, lock: transaction.LOCK.SHARE });
    exigir(producto.estado === 'activo' && categoria?.activa === true, 'producto_inactivo');
  }
  let variante = null;
  if (varianteId !== null) {
    variante = await VarianteProducto.findOne({ where: { id: varianteId, producto_id: productoId },
      attributes: ['id', 'nombre_variante'], transaction, lock: transaction.LOCK.UPDATE });
    exigir(variante, 'variante_inexistente');
  }
  return { ...producto.toJSON(), nombre_variante: variante?.nombre_variante ?? null };
}

async function cargarInsumos(ids, transaction, activos = true) {
  const unicos = [...new Set(ids)].sort((a, b) => a - b);
  if (!unicos.length) return new Map();
  const filas = await InsumoAlmacen.findAll({ where: { id: unicos }, attributes: ['id', 'nombre', 'unidad_medida_id', 'activo'],
    order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
  exigir(filas.length === unicos.length, 'insumo_inexistente');
  if (activos) exigir(filas.every(i => i.activo === true), 'insumo_inactivo');
  const unidades = await UnidadMedida.findAll({ where: { id: [...new Set(filas.map(i => i.unidad_medida_id))].sort((a, b) => a - b) },
    order: [['id', 'ASC']], transaction, lock: transaction.LOCK.SHARE });
  const unidadesPorId = new Map(unidades.map(u => [u.id, u]));
  return new Map(filas.map(i => [i.id, { id: i.id, nombre: i.nombre, activo: i.activo,
    unidad: unidadesPorId.get(i.unidad_medida_id)?.toJSON() }]));
}

function convertir(entrada, insumo, delta = false) {
  const base = unidadCanonica(insumo.unidad?.abreviatura);
  exigir(base, 'unidad_incompatible');
  const conversion = convertirCantidadBase(delta ? entrada.delta_cantidad_base : entrada.cantidad_bruta_necesaria,
    entrada.unidad ?? base, base, { negativo: delta });
  exigir(!conversion.error, conversion.error);
  return conversion;
}

const serializarFila = (fila, insumos) => ({ ...Object.fromEntries(CAMPOS_BOM.map(c => [c, fila.get(c)])), insumo: insumos.get(fila.insumo_id) });

export function vincularIngrediente(datos) {
  const entrada = validarVinculoReceta(datos);
  if (!entrada) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    await productoPreparado(entrada.producto_venta_id, entrada.variante_id, transaction);
    const filtro = { producto_venta_id: entrada.producto_venta_id, variante_id: entrada.variante_id };
    const insumos = await cargarInsumos([entrada.ingrediente.insumo_id], transaction);
    const convertido = convertir(entrada.ingrediente, insumos.get(entrada.ingrediente.insumo_id));
    let fila = await RecetaBom.findOne({ where: { ...filtro, insumo_id: entrada.ingrediente.insumo_id }, attributes: CAMPOS_BOM, transaction });
    const creado = !fila;
    if (creado) exigir(await RecetaBom.count({ where: filtro, transaction }) < 100, 'demasiados_ingredientes');
    const valores = { ...filtro, insumo_id: entrada.ingrediente.insumo_id, cantidad_bruta_necesaria: convertido.cantidad,
      porcentaje_merma_esperado: entrada.ingrediente.porcentaje_merma_esperado };
    if (fila) await fila.update(valores, { fields: Object.keys(valores), transaction });
    else fila = await RecetaBom.create(valores, { fields: Object.keys(valores), transaction });
    await fila.reload({ attributes: CAMPOS_BOM, transaction });
    return { estado: creado ? 'creado' : 'actualizado', ingrediente: serializarFila(fila, insumos) };
  });
}

export function reemplazarReceta(productoId, datos) {
  const entrada = validarRecetaCompleta(datos);
  if (!entrada || !esIdRecetaValido(productoId)) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    await productoPreparado(productoId, entrada.variante_id, transaction);
    const insumos = await cargarInsumos(entrada.ingredientes.map(i => i.insumo_id), transaction);
    const filas = entrada.ingredientes.map(i => ({ producto_venta_id: productoId, variante_id: entrada.variante_id,
      insumo_id: i.insumo_id, cantidad_bruta_necesaria: convertir(i, insumos.get(i.insumo_id)).cantidad,
      porcentaje_merma_esperado: i.porcentaje_merma_esperado }));
    // Validar el conjunto antes de sustituir. Un error revierte toda la receta.
    await RecetaBom.destroy({ where: { producto_venta_id: productoId, variante_id: entrada.variante_id }, transaction });
    await RecetaBom.bulkCreate(filas, { fields: ['producto_venta_id', 'variante_id', 'insumo_id', 'cantidad_bruta_necesaria', 'porcentaje_merma_esperado'], transaction });
    return { estado: 'actualizado', receta: { producto_venta_id: productoId, variante_id: entrada.variante_id,
      ingredientes: filas.map(f => ({ ...f, insumo: insumos.get(f.insumo_id) })) } };
  });
}

export function consultarReceta(productoId, varianteId = null) {
  return ejecutar(async transaction => {
    await productoPreparado(productoId, varianteId, transaction);
    const filas = await RecetaBom.findAll({ where: { producto_venta_id: productoId, variante_id: varianteId },
      attributes: CAMPOS_BOM, order: [['insumo_id', 'ASC']], transaction });
    const insumos = await cargarInsumos(filas.map(f => f.insumo_id), transaction, false);
    return { estado: 'consultado', receta: { producto_venta_id: productoId, variante_id: varianteId,
      ingredientes: filas.map(f => serializarFila(f, insumos)) } };
  });
}

async function cargarModificador(id, transaction) {
  const item = await ModificadorItem.findByPk(id, { attributes: ['id', 'grupo_id'], transaction });
  exigir(item, 'modificador_inexistente');
  const grupo = await ModificadorCatalogo.findByPk(item.grupo_id, { attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
  exigir(grupo, 'modificador_inexistente');
  const actual = await ModificadorItem.findByPk(id, { attributes: ['id', 'es_exclusion'], transaction, lock: transaction.LOCK.UPDATE });
  exigir(actual, 'modificador_inexistente');
  return actual;
}

export function vincularDelta(datos) {
  const entrada = validarDeltaReceta(datos);
  if (!entrada) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    const item = await cargarModificador(entrada.modificador_id, transaction);
    const insumos = await cargarInsumos([entrada.insumo_id], transaction);
    const conversion = convertir(entrada, insumos.get(entrada.insumo_id), true);
    exigir(item.es_exclusion ? conversion.escalada < 0n : conversion.escalada > 0n, 'signo_delta_invalido');
    const filtro = { modificador_id: entrada.modificador_id, insumo_id: entrada.insumo_id };
    // Lectura actual tras esperar el grupo: evita usar una vista anterior
    // a otra alta concurrente bajo REPEATABLE READ.
    const anterior = await ModificadorBom.findOne({ where: filtro, transaction, lock: transaction.LOCK.UPDATE });
    if (!anterior) {
      const existentes = await ModificadorBom.findAll({ where: { modificador_id: entrada.modificador_id },
        attributes: ['modificador_id', 'insumo_id'], transaction, lock: transaction.LOCK.UPDATE });
      exigir(existentes.length < 100, 'demasiados_ingredientes');
    }
    const valores = { ...filtro, delta_cantidad_base: conversion.cantidad };
    if (anterior) await anterior.update(valores, { fields: ['delta_cantidad_base'], transaction });
    else await ModificadorBom.create(valores, { fields: Object.keys(valores), transaction });
    return { estado: anterior ? 'actualizado' : 'creado', delta: { ...valores, insumo: insumos.get(entrada.insumo_id) } };
  });
}

export function consultarDeltas(modificadorId) {
  if (!esIdRecetaValido(modificadorId)) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    await cargarModificador(modificadorId, transaction);
    const filas = await ModificadorBom.findAll({ where: { modificador_id: modificadorId }, order: [['insumo_id', 'ASC']], transaction, lock: transaction.LOCK.SHARE });
    const insumos = await cargarInsumos(filas.map(f => f.insumo_id), transaction, false);
    return { estado: 'consultado', deltas: filas.map(f => ({ ...f.toJSON(), insumo: insumos.get(f.insumo_id) })) };
  });
}

export function retirarDelta(modificadorId, insumoId) {
  if (!esIdRecetaValido(modificadorId) || !esIdRecetaValido(insumoId)) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    await cargarModificador(modificadorId, transaction);
    await ModificadorBom.destroy({ where: { modificador_id: modificadorId, insumo_id: insumoId }, transaction });
    return { estado: 'retirado' };
  });
}

// Resolver cada receta dentro de la misma transacción que vaya a crear la tarea.
// No acepta deltas libres del cliente ni reescribe snapshots ya guardados.
export function resolverReceta(datos, { transaction } = {}) {
  const entrada = validarResolucionReceta(datos);
  if (!entrada) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async tx => {
    const producto = await productoPreparado(entrada.producto_venta_id, entrada.variante_id, tx, true);
    let filas = entrada.variante_id === null ? [] : await RecetaBom.findAll({ where: { producto_venta_id: producto.id, variante_id: entrada.variante_id }, attributes: CAMPOS_BOM, transaction: tx });
    const origen = filas.length ? 'variante' : 'base';
    if (!filas.length) filas = await RecetaBom.findAll({ where: { producto_venta_id: producto.id, variante_id: null }, attributes: CAMPOS_BOM, transaction: tx });
    exigir(filas.length > 0, 'receta_inexistente');

    const vinculos = await ProductoModificador.findAll({ where: { producto_id: producto.id }, attributes: ['grupo_id'], transaction: tx });
    const grupos = vinculos.length ? await ModificadorCatalogo.findAll({ where: { id: vinculos.map(v => v.grupo_id) }, order: [['id', 'ASC']], transaction: tx, lock: tx.LOCK.UPDATE }) : [];
    const opciones = entrada.modificadores.length ? await ModificadorItem.findAll({ where: { id: entrada.modificadores }, order: [['id', 'ASC']], transaction: tx, lock: tx.LOCK.UPDATE }) : [];
    exigir(opciones.length === entrada.modificadores.length && opciones.every(o => grupos.some(g => g.id === o.grupo_id)), 'modificador_no_asignado');
    for (const grupo of grupos) {
      const seleccionados = opciones.filter(o => o.grupo_id === grupo.id).length;
      exigir(!grupo.es_obligatorio || seleccionados > 0, 'modificador_obligatorio');
      exigir(grupo.es_multiple || seleccionados <= 1, 'seleccion_multiple_invalida');
    }
    const deltas = opciones.length ? await ModificadorBom.findAll({ where: { modificador_id: opciones.map(o => o.id) }, order: [['modificador_id', 'ASC'], ['insumo_id', 'ASC']], transaction: tx, lock: tx.LOCK.SHARE }) : [];
    const insumos = await cargarInsumos([...filas.map(f => f.insumo_id), ...deltas.map(d => d.insumo_id)], tx);
    const cantidades = new Map(filas.map(f => [f.insumo_id, cantidadEscalada(f.cantidad_bruta_necesaria)]));
    for (const delta of deltas) {
      const valor = cantidadEscalada(delta.delta_cantidad_base);
      const opcion = opciones.find(o => o.id === delta.modificador_id);
      exigir(opcion.es_exclusion ? valor < 0n : valor > 0n, 'signo_delta_invalido');
      cantidades.set(delta.insumo_id, (cantidades.get(delta.insumo_id) ?? 0n) + valor);
    }
    const ingredientes = [...cantidades].sort(([a], [b]) => a - b).map(([id, cantidad]) => {
      exigir(cantidad >= 0n, 'consumo_negativo');
      const total = cantidad * BigInt(entrada.cantidad);
      exigir(total <= MAX_CANTIDAD_ESCALADA, 'cantidad_fuera_rango');
      const insumo = insumos.get(id);
      exigir(unidadCanonica(insumo.unidad?.abreviatura), 'unidad_incompatible');
      return { insumo_id: id, nombre: insumo.nombre, unidad_medida_id: insumo.unidad.id,
        unidad: insumo.unidad.abreviatura, cantidad_bruta_unitaria: formatearCantidad(cantidad), cantidad_bruta_total: formatearCantidad(total) };
    }).filter(i => i.cantidad_bruta_total !== '0.0000');
    exigir(ingredientes.length > 0, 'receta_vacia');
    const snapshot = congelarSnapshotReceta({ version: 1, producto_venta_id: producto.id, nombre_producto: producto.nombre,
      variante_id: entrada.variante_id, nombre_variante: producto.nombre_variante, origen, cantidad: entrada.cantidad,
      modificadores: opciones.map(o => ({ id: o.id, nombre: o.nombre_modificador, es_exclusion: o.es_exclusion })), ingredientes });
    return { estado: 'consultado', receta: snapshot };
  }, transaction);
}

export function consultarInsumosReceta({ pagina = 1, limite = 20, busqueda = '' }) {
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000 || !Number.isSafeInteger(limite) || limite < 1 || limite > 50 ||
      typeof busqueda !== 'string' || [...busqueda].length > 150 || [...busqueda].some(c => c.codePointAt(0) <= 31 || (c.codePointAt(0) >= 127 && c.codePointAt(0) <= 159))) return Promise.resolve({ estado: 'datos_invalidos' });
  return ejecutar(async transaction => {
    const filtro = busqueda.trim() ? { [Op.or]: ['nombre', 'codigo'].map(c => where(fn('LOCATE', busqueda.trim(), col(c)), { [Op.gt]: 0 })) } : {};
    const { count, rows } = await InsumoAlmacen.findAndCountAll({ where: filtro, attributes: ['id', 'nombre', 'codigo', 'activo', 'unidad_medida_id'], order: [['id', 'ASC']], limit: limite, offset: (pagina - 1) * limite, transaction });
    const unidades = rows.length ? await UnidadMedida.findAll({ where: { id: rows.map(i => i.unidad_medida_id) }, transaction }) : [];
    return { estado: 'consultado', insumos: rows.map(i => {
      const unidad = unidades.find(u => u.id === i.unidad_medida_id)?.toJSON();
      return { ...i.toJSON(), unidad, unidades_compatibles: unidadesCompatibles(unidadCanonica(unidad?.abreviatura)) };
    }), paginacion: { pagina, limite, total: count, totalPaginas: Math.ceil(count / limite) } };
  });
}
