import { randomUUID } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { PedidoMaster, PedidoItemKds, PedidoItemModificador, ProductoVenta, VarianteProducto,
  CategoriaVenta, ModificadorCatalogo, ModificadorItem, ProductoModificador, ModificadorBom,
  Cliente, DireccionCliente, MesaSalon, InsumoAlmacen, UnidadMedida, KdsTarea } from '../models/index.js';
import { resolverReceta } from './recetas.service.js';
import { reservarTareas } from './inventario.service.js';
import { operacionComercial, auditoriaComercial, eventoComercial } from './operacion-comercial.js';
import { exigirPedido as exigir, idEntero, idGrande, campos, texto, validarLineas, dinero, centimos } from './pedidos-calculo.js';

export async function bloquearPedido(id, tx) {
  const pedido = await PedidoMaster.findByPk(idGrande(id), { transaction: tx, lock: tx.LOCK.UPDATE });
  exigir(pedido, 'PEDIDO_INEXISTENTE');
  return pedido;
}
export function comprobarVersion(pedido, version) {
  exigir(Number.isSafeInteger(version) && version > 0);
  exigir(pedido.version === version, 'PEDIDO_DESACTUALIZADO', { version: pedido.version });
}
export async function liberarBloqueoVencido(pedido, tx) {
  if (pedido.estado_cuenta === 'bloqueada_en_pago' && pedido.bloqueo_hasta && pedido.bloqueo_hasta <= new Date()) {
    await pedido.update({ estado_cuenta: 'abierta', bloqueo_usuario_id: null, bloqueo_hasta: null, version: pedido.version + 1 }, { transaction: tx });
  }
}
// Solo información comercial: no exponer recetas internas ni costos al cliente HTTP.
export async function respuestaPedido(pedido, tx) {
  const lineas = await PedidoItemKds.findAll({ where: { pedido_id: pedido.id }, order: [['id', 'ASC']], transaction: tx });
  return { pedido: { id: String(pedido.id), codigo_pedido: pedido.codigo_pedido, tipo_atencion: pedido.tipo_atencion,
    mesa_id: pedido.mesa_id, cliente_id: pedido.cliente_id, direccion_id: pedido.direccion_id, estado_cuenta: pedido.estado_cuenta,
    total_preliminar: pedido.total_preliminar, version: pedido.version, bloqueo_usuario_id: pedido.bloqueo_usuario_id,
    bloqueo_hasta: pedido.bloqueo_hasta, notas_globales: pedido.notas_globales, cliente: pedido.snapshot_cliente_json,
    lineas: lineas.map(l => ({ id: String(l.id), productoId: l.producto_venta_id, varianteId: l.variante_id,
      cantidad: l.cantidad, precio_unitario: l.precio_unitario_grabado, subtotal: l.subtotal_item,
      indicaciones: l.notas_preparacion, estado: l.estado_item, preparacion: l.estado_kanban,
      nombre: l.snapshot_item_json.nombre, variante: l.snapshot_item_json.variante,
      modificadores: l.snapshot_item_json.modificadores })) } };
}
export async function consultarPedido(id) {
  return sequelize.transaction(async tx => {
    const pedido = await bloquearPedido(id, tx);
    await liberarBloqueoVencido(pedido, tx);
    return respuestaPedido(pedido, tx);
  });
}
async function contextoPedido(datos, tx) {
  exigir(['salon', 'llevar', 'delivery'].includes(datos.tipo_atencion));
  const mesaId = datos.mesa_id ?? null, clienteId = datos.cliente_id ?? null, direccionId = datos.direccion_id ?? null;
  exigir([mesaId, clienteId, direccionId].every(id => id === null || idEntero(id)));
  exigir(datos.tipo_atencion === 'salon' ? mesaId !== null && direccionId === null : mesaId === null);
  exigir(datos.tipo_atencion === 'delivery' ? clienteId !== null && direccionId !== null : direccionId === null);
  let snapshot = null;
  if (clienteId) {
    const c = await Cliente.findByPk(clienteId, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(c?.estado === 'activo', 'CLIENTE_NO_DISPONIBLE');
    snapshot = { id: c.id, nombre: [c.nombres, c.apellidos].filter(Boolean).join(' '), telefono: c.telefono_principal };
    if (direccionId) {
      const d = await DireccionCliente.findOne({ where: { id: direccionId, cliente_id: clienteId }, transaction: tx, lock: tx.LOCK.SHARE });
      exigir(d, 'DIRECCION_NO_DISPONIBLE');
      snapshot.direccion = { id: d.id, direccion: d.direccion_completa, referencia: d.referencia };
    }
  }
  if (mesaId) {
    const mesa = await MesaSalon.findByPk(mesaId, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(mesa?.estado_actual === 'libre', 'MESA_NO_DISPONIBLE');
    await mesa.update({ estado_actual: 'ocupada' }, { transaction: tx });
  }
  return { mesa_id: mesaId, cliente_id: clienteId, direccion_id: direccionId, snapshot_cliente_json: snapshot };
}
async function prepararLinea(linea, tx) {
  const p = await ProductoVenta.findByPk(linea.productoId, { transaction: tx, lock: tx.LOCK.UPDATE });
  exigir(p?.estado === 'activo', 'PRODUCTO_NO_DISPONIBLE');
  const categoria = await CategoriaVenta.findByPk(p.categoria_id, { transaction: tx, lock: tx.LOCK.SHARE });
  exigir(categoria?.activa, 'PRODUCTO_NO_DISPONIBLE');
  exigir(['plato_preparado', 'producto_directo'].includes(p.tipo_producto), 'PRODUCTO_NO_SOPORTADO');
  const variante = linea.varianteId === null ? null : await VarianteProducto.findOne({ where: { id: linea.varianteId, producto_id: p.id }, transaction: tx, lock: tx.LOCK.SHARE });
  exigir(linea.varianteId === null || variante, 'VARIANTE_NO_DISPONIBLE');
  const vinculos = await ProductoModificador.findAll({ where: { producto_id: p.id }, transaction: tx });
  const grupos = vinculos.length ? await ModificadorCatalogo.findAll({ where: { id: vinculos.map(v => v.grupo_id) }, order: [['id', 'ASC']], transaction: tx, lock: tx.LOCK.UPDATE }) : [];
  const opciones = linea.modificadoresIds.length ? await ModificadorItem.findAll({ where: { id: linea.modificadoresIds }, order: [['id', 'ASC']], transaction: tx, lock: tx.LOCK.SHARE }) : [];
  exigir(opciones.length === linea.modificadoresIds.length && opciones.every(o => grupos.some(g => g.id === o.grupo_id)), 'MODIFICADOR_NO_DISPONIBLE');
  for (const g of grupos) {
    const n = opciones.filter(o => o.grupo_id === g.id).length;
    exigir((!g.es_obligatorio || n > 0) && (g.es_multiple || n <= 1), 'SELECCION_INCOMPLETA');
  }
  const unitario = centimos(p.precio_venta_base) + (variante ? centimos(variante.precio_adicional) : 0n) + opciones.reduce((s, o) => s + centimos(o.precio_adicional), 0n);
  const subtotal = dinero(unitario * BigInt(linea.cantidad));
  let receta;
  if (p.tipo_producto === 'plato_preparado') {
    const r = await resolverReceta({ producto_venta_id: p.id, variante_id: linea.varianteId, cantidad: linea.cantidad, modificadores: linea.modificadoresIds }, { transaction: tx });
    exigir(r.estado === 'consultado', 'RECETA_NO_DISPONIBLE', { motivo: r.estado, productoId: p.id });
    receta = r.receta;
  } else {
    // Venta directa consume una unidad de su insumo propio al despachar, nunca
    // al cobrar. No admitir deltas de recetas sin implementarlos en este flujo.
    exigir(p.controla_stock && p.insumo_directo_id, 'INSUMO_NO_DISPONIBLE');
    const i = await InsumoAlmacen.findByPk(p.insumo_directo_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    const u = i && await UnidadMedida.findByPk(i.unidad_medida_id, { transaction: tx, lock: tx.LOCK.SHARE });
    exigir(i?.activo && u?.abreviatura?.toLowerCase() === 'un', 'INSUMO_NO_DISPONIBLE');
    exigir(!opciones.length || await ModificadorBom.count({ where: { modificador_id: opciones.map(o => o.id) }, transaction: tx }) === 0, 'PRODUCTO_NO_SOPORTADO');
    receta = { version: 1, producto_venta_id: p.id, variante_id: linea.varianteId, cantidad: linea.cantidad,
      ingredientes: [{ insumo_id: i.id, unidad_medida_id: i.unidad_medida_id, unidad: 'un',
        cantidad_bruta_unitaria: '1.0000', cantidad_bruta_total: `${linea.cantidad}.0000` }] };
  }
  return { linea, p, categoria, receta, opciones, unitario: dinero(unitario), subtotal,
    snapshot: { version: 1, nombre: p.nombre, sku: p.sku, variante: variante?.nombre_variante ?? null,
      puntos_recompensa: p.puntos_recompensa ?? 0, modificadores: opciones.map(o => ({ id: o.id, nombre: o.nombre_modificador, precio: o.precio_adicional })), indicaciones: linea.indicaciones } };
}
async function agregarLineas(pedido, lineas, usuarioId, tx) {
  const existentes = await PedidoItemKds.count({ where: { pedido_id: pedido.id, estado_item: 'activo' }, transaction: tx });
  exigir(existentes + lineas.length <= 100, 'LIMITE_LINEAS');
  // Bloquear productos por PK antes de resolver para reducir ciclos de bloqueo.
  const ids = [...new Set(lineas.map(l => l.productoId))].sort((a, b) => a - b);
  for (const id of ids) await ProductoVenta.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
  const preparadas = [];
  for (const l of lineas) preparadas.push(await prepararLinea(l, tx));
  const tareas = [], cocina = [];
  let total = centimos(pedido.total_preliminar);
  for (const r of preparadas) {
    const item = await PedidoItemKds.create({ pedido_id: pedido.id, producto_venta_id: r.p.id, variante_id: r.linea.varianteId,
      cantidad: r.linea.cantidad, precio_unitario_grabado: r.unitario, subtotal_item: r.subtotal,
      notas_preparacion: r.linea.indicaciones || null, snapshot_item_json: r.snapshot }, { transaction: tx });
    for (const o of r.opciones) await PedidoItemModificador.create({ pedido_item_id: item.id, modificador_id: o.id, precio_adicional_grabado: o.precio_adicional }, { transaction: tx });
    const tarea = await KdsTarea.create({ pedido_item_id: item.id, producto_id: r.p.id, variante_id: r.linea.varianteId,
      cantidad: r.linea.cantidad, snapshot_json: { ...r.receta, nombre_producto: r.p.nombre, indicaciones: r.linea.indicaciones,
        modificadores: r.snapshot.modificadores, canal: r.categoria.es_para_kds ? 'cocina' : 'despacho' } }, { transaction: tx });
    tareas.push(tarea.id);
    if (r.categoria.es_para_kds) cocina.push(String(tarea.id));
    total += centimos(r.subtotal);
  }
  await reservarTareas(tareas, { transaction: tx });
  await pedido.update({ total_preliminar: dinero(total), version: pedido.version + (existentes ? 1 : 0) }, { transaction: tx });
  await auditoriaComercial(usuarioId, 'pedidos_master', pedido.id, { version: pedido.version, tareas: tareas.map(String), total: pedido.total_preliminar }, tx);
  await eventoComercial('pedido.confirmado', 'pedidos_master', pedido.id, pedido.version, { pedido_id: String(pedido.id), tareas: tareas.map(String) }, tx);
  if (cocina.length) await eventoComercial('pedido.cocina', 'pedidos_master', pedido.id, pedido.version, { pedido_id: String(pedido.id), tareas: cocina }, tx);
}
export function crearPedido(datos, contexto) {
  campos(datos, ['tipo_atencion', 'mesa_id', 'cliente_id', 'direccion_id', 'notas_globales', 'lineas']);
  const lineas = validarLineas(datos.lineas), notas = texto(datos.notas_globales, 500);
  return operacionComercial({ ...contexto, tipo: 'pedido.crear', cuerpo: datos }, async tx => {
    const valores = await contextoPedido(datos, tx);
    const pedido = await PedidoMaster.create({ ...valores, codigo_pedido: `P-${randomUUID().replaceAll('-', '').slice(0, 18)}`,
      tipo_atencion: datos.tipo_atencion, usuario_creador_id: contexto.usuarioId, notas_globales: notas || null }, { transaction: tx });
    await agregarLineas(pedido, lineas, contexto.usuarioId, tx);
    return respuestaPedido(pedido, tx);
  });
}
export function ampliarPedido(id, datos, contexto) {
  id = idGrande(id); campos(datos, ['version', 'lineas']); const lineas = validarLineas(datos.lineas);
  return operacionComercial({ ...contexto, tipo: 'pedido.ampliar', cuerpo: { id, ...datos } }, async tx => {
    const pedido = await bloquearPedido(id, tx);
    await liberarBloqueoVencido(pedido, tx);
    comprobarVersion(pedido, datos.version);
    exigir(pedido.estado_cuenta === 'abierta', 'PEDIDO_NO_ABIERTO');
    await agregarLineas(pedido, lineas, contexto.usuarioId, tx);
    return respuestaPedido(pedido, tx);
  });
}
export function cambiarBloqueoPago(id, datos, contexto, liberar = false) {
  id = idGrande(id); campos(datos, ['version']);
  return operacionComercial({ ...contexto, tipo: liberar ? 'pedido.liberar_pago' : 'pedido.bloquear_pago', cuerpo: { id, ...datos } }, async tx => {
    const p = await bloquearPedido(id, tx);
    await liberarBloqueoVencido(p, tx);
    comprobarVersion(p, datos.version);
    exigir(liberar ? p.estado_cuenta === 'bloqueada_en_pago' && p.bloqueo_usuario_id === contexto.usuarioId : p.estado_cuenta === 'abierta', 'BLOQUEO_NO_DISPONIBLE');
    await p.update({ estado_cuenta: liberar ? 'abierta' : 'bloqueada_en_pago', bloqueo_usuario_id: liberar ? null : contexto.usuarioId,
      bloqueo_hasta: liberar ? null : new Date(Date.now() + 5 * 60000), version: p.version + 1 }, { transaction: tx });
    return respuestaPedido(p, tx);
  });
}
