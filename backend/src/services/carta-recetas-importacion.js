import { createHash } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { Rol, ProductoVenta, VarianteProducto, RecetaBom, InsumoAlmacen, UnidadMedida, ModificadorCatalogo, ModificadorItem, ProductoModificador, ModificadorBom, ConfiguracionGlobal, AuditLog } from '../models/index.js';
import { productosCarta } from '../../data/carta-veneziana.mjs';
import { recetasCarta, insumosRecetario, opcionesRecetario, referenciaRecetario, frutaGordo } from '../../data/carta-recetas.mjs';
import { aplicarMermaIngrediente } from '../../data/carta-mermas.mjs';
export const CLAVE_RECETARIO = 'CARTA_RECETAS_REFERENCIA_V1';
const exigir = (c, texto) => { if (!c) throw new Error(texto); };
const firma = filas => JSON.stringify(filas.map(f => [f.insumo_id, f.cantidad_bruta_necesaria ?? f.delta_cantidad_base, f.porcentaje_merma_esperado ?? null]).sort(([a], [b]) => a - b));
export function validarRecetario() {
  const claves = new Set(insumosRecetario.map(i => i.clave)), vistas = new Set();
  exigir(claves.size === insumosRecetario.length, 'Insumo repetido.');
  for (const r of recetasCarta) {
    const p = productosCarta.find(p => p.sku === r.sku), identidad = `${r.sku}|${r.variante ?? ''}`;
    exigir(p && !p.directo && !vistas.has(identidad) && (r.variante === null || p.variantes?.some(v => v.nombre === r.variante)), `Receta sin presentación: ${identidad}`);
    vistas.add(identidad);
    exigir(r.ingredientes.length > 0 && r.ingredientes.length <= 100 && new Set(r.ingredientes.map(i => i.insumo)).size === r.ingredientes.length, `Receta vacía/duplicada: ${identidad}`);
    for (const i of r.ingredientes) exigir(claves.has(i.insumo) && /^\d+\.\d{4}$/.test(i.cantidad) && BigInt(i.cantidad.replace('.', '')) > 0n, `Cantidad inválida: ${identidad}`);
  }
  for (const p of productosCarta.filter(p => !p.directo)) for (const v of [null, ...(p.variantes ?? []).map(v => v.nombre)]) exigir(vistas.has(`${p.sku}|${v ?? ''}`), `Presentación sin receta: ${p.sku}`);
  for (const o of opcionesRecetario) {
    exigir(new Set(o.ingredientes.map(i => i.insumo)).size === o.ingredientes.length, `Opción duplicada: ${o.opcion}`);
    for (const i of o.ingredientes) exigir(claves.has(i.insumo) && /^\d+\.\d{4}$/.test(i.cantidad) && BigInt(i.cantidad.replace('.', '')) > 0n, `Cantidad inválida de opción: ${o.opcion}`);
  }
  return { productos: productosCarta.length, preparados: productosCarta.filter(p => !p.directo).length, directos: productosCarta.filter(p => p.directo).length, recetas: recetasCarta.length, insumos: insumosRecetario.length, filas: recetasCarta.reduce((n, r) => n + r.ingredientes.length, 0), opciones: opcionesRecetario.length };
}

// Completar datos maestros únicamente. Nunca crear compras, consumos ni saldos.
// Las recetas diferentes ya existentes se rechazan; no borrar trabajo de cocina.
export function importarRecetario({ transaction: padre, aplicar = false, merma = false } = {}) {
  const manifiesto = validarRecetario();
  return sequelize.transaction(padre ? { transaction: padre } : {}, async tx => {
    const opciones = aplicar ? { transaction: tx, lock: tx.LOCK.UPDATE } : { transaction: tx };
    if (aplicar) exigir(await Rol.findOne({ where: { nombre: 'administrador' }, ...opciones }), 'Falta el rol administrador.');
    const referenciaPrevia = await ConfiguracionGlobal.findByPk(CLAVE_RECETARIO, opciones);
    const conMerma = merma || referenciaPrevia?.valor_json?.merma_version === 1;
    const convertir = i => conMerma ? aplicarMermaIngrediente(i) : { ...i, merma: '0.00' };
    const productos = await ProductoVenta.findAll({ where: { sku: productosCarta.map(p => p.sku) }, ...opciones });
    exigir(productos.length === productosCarta.length, 'Faltan productos de la carta en la base de datos.');
    const porSku = new Map(productos.map(p => [p.sku, p]));
    const variantes = await VarianteProducto.findAll({ where: { producto_id: productos.map(p => p.id) }, ...opciones });
    const cambios = { unidades: 0, insumos: 0, recetas: 0, filas: 0, opciones: 0, deltas: 0, mermas: 0 };
    for (const p of productosCarta) {
      const real = porSku.get(p.sku);
      exigir(real.tipo_producto === (p.directo ? 'producto_directo' : 'plato_preparado'), `Tipo de producto cambiado: ${p.sku}`);
      if (p.directo) {
        const i = await InsumoAlmacen.findByPk(real.insumo_directo_id, { transaction: tx });
        exigir(i && i.activo, `Artículo directo sin insumo activo: ${p.sku}`);
        const u = await UnidadMedida.findByPk(i.unidad_medida_id, { transaction: tx });
        exigir(u?.abreviatura.toLowerCase() === 'un', `Artículo directo sin unidad: ${p.sku}`);
      }
    }
    const unidades = new Map(), insumos = new Map();
    for (const abreviatura of ['kg', 'l', 'un']) {
      let u = await UnidadMedida.findOne({ where: { abreviatura }, ...opciones });
      if (!u && aplicar) { u = await UnidadMedida.create({ abreviatura, nombre: { kg: 'Kilogramo', l: 'Litro', un: 'Unidad' }[abreviatura] }, { transaction: tx }); cambios.unidades++; }
      unidades.set(abreviatura, u);
    }
    for (const i of insumosRecetario) {
      let actual = await InsumoAlmacen.findOne({ where: { codigo: i.codigo }, ...opciones });
      if (actual) exigir(actual.unidad_medida_id === unidades.get(i.unidad)?.id && actual.activo, `Insumo incompatible/inactivo: ${i.codigo}`);
      else if (aplicar) {
        const homonimo = await InsumoAlmacen.findOne({ where: { nombre: i.nombre }, transaction: tx });
        exigir(!homonimo, `Ya existe el insumo con otro código: ${i.nombre}. Revisar para evitar duplicados.`);
        actual = await InsumoAlmacen.create({ codigo: i.codigo, nombre: i.nombre, unidad_medida_id: unidades.get(i.unidad).id, activo: true }, { transaction: tx }); cambios.insumos++;
      }
      if (actual) insumos.set(i.clave, actual);
    }
    for (const r of recetasCarta) {
      const p = porSku.get(r.sku), v = r.variante === null ? null : variantes.find(v => v.producto_id === p.id && v.nombre_variante === r.variante);
      exigir(r.variante === null || v, `Falta variante ${r.sku}: ${r.variante}`);
      const where = { producto_venta_id: p.id, variante_id: v?.id ?? null };
      const actuales = await RecetaBom.findAll({ where, ...opciones });
      if (!aplicar && !actuales.length) continue;
      exigir(r.ingredientes.every(i => insumos.has(i.insumo)), `Receta existente con otros insumos: ${r.sku}`);
      const originales = r.ingredientes.map(i => ({ ...where, insumo_id: insumos.get(i.insumo).id, cantidad_bruta_necesaria: i.cantidad, porcentaje_merma_esperado: '0.00' }));
      const filas = r.ingredientes.map(convertir).map(i => ({ ...where, insumo_id: insumos.get(i.insumo).id, cantidad_bruta_necesaria: i.cantidad, porcentaje_merma_esperado: i.merma }));
      if (actuales.length) {
        const igual = firma(actuales) === firma(filas);
        exigir(igual || (conMerma && !referenciaPrevia?.valor_json?.merma_version && firma(actuales) === firma(originales)), `Receta existente distinta: ${r.sku}/${r.variante ?? 'base'}. No se sobrescribió.`);
        if (!igual && aplicar) for (const fila of filas) {
          await RecetaBom.update({ cantidad_bruta_necesaria: fila.cantidad_bruta_necesaria, porcentaje_merma_esperado: fila.porcentaje_merma_esperado }, { where: { ...where, insumo_id: fila.insumo_id }, transaction: tx });
          cambios.mermas++;
        }
      }
      else if (aplicar) { await RecetaBom.bulkCreate(filas, { transaction: tx }); cambios.recetas++; cambios.filas += filas.length; }
    }
    // La carta permite fruta opcional en Gordo Jeu; crear su elección sin
    // modificar precios ni las elecciones de otros productos.
    if (aplicar) {
      const [grupo] = await ModificadorCatalogo.findOrCreate({ where: { nombre_grupo: frutaGordo.grupo }, defaults: { es_multiple: false, es_obligatorio: false }, transaction: tx });
      exigir(!grupo.es_multiple && !grupo.es_obligatorio, 'Grupo de fruta incompatible.');
      const [item, creado] = await ModificadorItem.findOrCreate({ where: { grupo_id: grupo.id, nombre_modificador: frutaGordo.opcion }, defaults: { precio_adicional: '0.00', es_exclusion: false }, transaction: tx });
      exigir(!item.es_exclusion && Number(item.precio_adicional) === 0, 'Opción de fruta incompatible.');
      await ProductoModificador.findOrCreate({ where: { producto_id: porSku.get(frutaGordo.sku).id, grupo_id: grupo.id }, transaction: tx });
      if (creado) cambios.opciones++;
    }
    for (const o of opcionesRecetario) {
      if (!aplicar && o.grupo === frutaGordo.grupo) continue;
      const grupo = await ModificadorCatalogo.findOne({ where: { nombre_grupo: o.grupo }, ...opciones });
      exigir(grupo, `Falta grupo: ${o.grupo}`);
      const opcion = await ModificadorItem.findOne({ where: { grupo_id: grupo.id, nombre_modificador: o.opcion }, ...opciones });
      exigir(opcion && !opcion.es_exclusion, `Falta opción aditiva: ${o.opcion}`);
      const actuales = await ModificadorBom.findAll({ where: { modificador_id: opcion.id }, ...opciones });
      if (!aplicar && !actuales.length) continue;
      exigir(o.ingredientes.every(i => insumos.has(i.insumo)), `Opción existente con otros insumos: ${o.opcion}`);
      const originales = o.ingredientes.map(i => ({ modificador_id: opcion.id, insumo_id: insumos.get(i.insumo).id, delta_cantidad_base: i.cantidad }));
      const filas = o.ingredientes.map(convertir).map(i => ({ modificador_id: opcion.id, insumo_id: insumos.get(i.insumo).id, delta_cantidad_base: i.cantidad }));
      if (actuales.length) {
        const igual = firma(actuales) === firma(filas);
        exigir(igual || (conMerma && !referenciaPrevia?.valor_json?.merma_version && firma(actuales) === firma(originales)), `Opción existente distinta: ${o.grupo}/${o.opcion}`);
        if (!igual && aplicar) for (const fila of filas) {
          await ModificadorBom.update({ delta_cantidad_base: fila.delta_cantidad_base }, { where: { modificador_id: opcion.id, insumo_id: fila.insumo_id }, transaction: tx }); cambios.mermas++;
        }
      }
      else if (filas.length) { await ModificadorBom.bulkCreate(filas, { transaction: tx }); cambios.opciones++; cambios.deltas += filas.length; }
    }
    if (aplicar) {
      const huella = createHash('sha256').update(JSON.stringify({ recetasCarta, opcionesRecetario })).digest('hex');
      const anterior = await ConfiguracionGlobal.findByPk(CLAVE_RECETARIO, opciones);
      const valor = { ...referenciaRecetario, huella, productos: productosCarta.filter(p => !p.directo).map(p => p.sku), totales: manifiesto };
      if (anterior) exigir(anterior.valor_json.huella === huella, 'Cambió la versión de la carga; revisar antes de repetir.');
      else await ConfiguracionGlobal.create({ parametro_key: CLAVE_RECETARIO, descripcion: 'Recetas referenciales basadas en cantidades del propietario y porciones estimadas.', valor_json: valor }, { transaction: tx });
      if (conMerma && !referenciaPrevia?.valor_json?.merma_version) await ConfiguracionGlobal.update({ valor_json: { ...(anterior?.valor_json ?? valor), merma_version: 1, merma: 'Objetivos netos convertidos una vez a brutos; porcentajes estimados por manipulación de insumos listos.' } }, { where: { parametro_key: CLAVE_RECETARIO }, transaction: tx });
      if (Object.values(cambios).some(Boolean) || !anterior) await AuditLog.create({ usuario_id: null, entidad_afectada: 'recetas_bom_master', tipo_evento: cambios.mermas ? 'UPDATE' : 'INSERT', descripcion: conMerma ? 'Recetario con merma estimada autorizada por el propietario. Sin alterar saldos, precios ni snapshots anteriores.' : 'Carga referencial de la carta autorizada por el propietario. Sin cambios de stock, costos ni precios.', datos_nuevos: { huella, conMerma, ...manifiesto, cambios } }, { transaction: tx });
    }
    return { aplicado: aplicar, conMerma, manifiesto, cambios };
  });
}
