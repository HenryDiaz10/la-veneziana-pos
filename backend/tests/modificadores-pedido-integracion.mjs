// MySQL local: fixtures propias; FINANZAS ficticia solo dentro de rollback.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { crearPedido, consultarPedido, cambiarBloqueoPago } from '../src/services/pedidos.service.js';
import { registrarMovimiento, consumirTarea } from '../src/services/inventario.service.js';
import { abrirCaja } from '../src/services/caja.service.js';
import { cobrarPedido } from '../src/services/cobros.service.js';
import { formatearTicket } from '../src/services/ticket-formato.js';
import { obtenerProductoPos } from '../src/services/pos.service.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], unidades = [], insumos = [], grupos = [], opciones = [];
let categoria, producto, caja, servidor, padre;
const ctx = (transaction) => ({ usuarioId: usuarios[0].id, clave: randomUUID(), transaction });
const rechaza = (fn, codigo) => assert.rejects(async () => fn(), e => e.codigo === codigo, `Esperado ${codigo}`);
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const nombre of ['cajero', 'cocinero']) {
    const rol = await m.Rol.findOne({ where: { nombre } }); assert.ok(rol);
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Prueba F35', email: `f35-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  categoria = await m.CategoriaVenta.create({ nombre: `F35 ${marca}`, slug: `f35-${marca}`, activa: true, es_para_kds: true });
  for (const abreviatura of ['un', 'kg']) unidades.push(await m.UnidadMedida.create({ nombre: `F35 ${abreviatura} ${marca}`, abreviatura }));
  for (const [i, nombre] of ['Masa', 'Queso', 'Aceitunas'].entries()) {
    const insumo = await m.InsumoAlmacen.create({ nombre: `F35 ${nombre} ${marca}`, codigo: `F35-${i}-${marca}`, unidad_medida_id: unidades[i ? 1 : 0].id, activo: true, perecible: false });
    insumos.push(insumo);
    await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: i === 0 ? '30' : i === 1 ? '5' : '1', costo_unitario: '1', operacion_uid: `mov:f35:${i}:${marca}`, usuario_id: usuarios[0].id });
  }
  producto = await m.ProductoVenta.create({ nombre: `Pizza F35 ${marca}`, categoria_id: categoria.id, precio_venta_base: '20.00', tipo_producto: 'plato_preparado', estado: 'activo' });
  for (const [i, cantidad] of ['1.0000', '0.2000', '0.0500'].entries()) await m.RecetaBom.create({ producto_venta_id: producto.id, insumo_id: insumos[i].id, cantidad_bruta_necesaria: cantidad });
  for (const [i, nombre] of ['Preparación', 'Extras y exclusiones', 'Otro producto'].entries()) grupos.push(await m.ModificadorCatalogo.create({ nombre_grupo: `${nombre} F35 ${marca.slice(0, 8)}`, es_obligatorio: i === 0, es_multiple: i === 1 }));
  for (const grupo of grupos.slice(0, 2)) await m.ProductoModificador.create({ producto_id: producto.id, grupo_id: grupo.id });
  for (const [nombre, grupo, precio, excluir] of [['Normal', 0, '0.00', false], ['Tostada', 0, '0.00', false], ['Queso extra', 1, '3.00', false], ['Sin aceitunas', 1, '0.00', true], ['Quitar demasiado queso', 1, '0.00', true], ['Opción ajena', 2, '0.00', false]]) {
    opciones.push(await m.ModificadorItem.create({ grupo_id: grupos[grupo].id, nombre_modificador: nombre, precio_adicional: precio, es_exclusion: excluir }));
  }
  for (const [opcion, insumo, delta] of [[2, 1, '0.1000'], [3, 2, '-0.0500'], [4, 1, '-0.5000']]) await m.ModificadorBom.create({ modificador_id: opciones[opcion].id, insumo_id: insumos[insumo].id, delta_cantidad_base: delta });
  const linea = { productoId: producto.id, modificadoresIds: [opciones[0].id, opciones[2].id, opciones[3].id], cantidad: 2, indicaciones: '  Bien   caliente\n poco ají  ' };
  const cuerpo = { tipo_atencion: 'llevar', lineas: [linea] };
  // Rechazar selecciones inválidas antes de conservar cabeceras o reservas.
  for (const [ids, codigo] of [[[opciones[2].id], 'SELECCION_INCOMPLETA'], [[opciones[0].id, opciones[1].id], 'SELECCION_INCOMPLETA'], [[opciones[0].id, opciones[5].id], 'MODIFICADOR_NO_DISPONIBLE'], [[opciones[0].id, opciones[4].id], 'RECETA_NO_DISPONIBLE'], [[opciones[0].id, opciones[0].id], 'DATOS_INVALIDOS']]) {
    await rechaza(() => crearPedido({ ...cuerpo, lineas: [{ ...linea, modificadoresIds: ids }] }, ctx()), codigo);
  }
  assert.equal(await m.PedidoMaster.count({ where: { usuario_creador_id: usuarios[0].id } }), 0);
  assert.ok((await m.InsumoAlmacen.findAll({ where: { id: insumos.map(i => i.id) } })).every(i => i.stock_reservado === '0.0000'));
  servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}/api`, cookies = [];
  for (const u of usuarios) {
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.origenFrontend, 'X-CSRF-Protection': '1' }, body: JSON.stringify({ email: u.email, password }) });
    assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]);
  }
  const pedir = async (ruta, method = 'GET', body, actor = 0, key = randomUUID()) => {
    const r = await fetch(base + ruta, { method, headers: { Cookie: cookies[actor], Origin: env.origenFrontend, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json() };
  };
  const config = await pedir(`/pos/productos/${producto.id}`);
  assert.equal(config.status, 200); assert.equal(config.json.configuracion.grupos.length, 2);
  assert.equal(config.json.configuracion.grupos[1].opciones.find(o => o.id === opciones[3].id).es_exclusion, true);
  assert.ok(!JSON.stringify(config.json).includes('delta_cantidad_base') && !JSON.stringify(config.json).includes('costo_promedio'));
  assert.equal((await pedir(`/pos/productos/${producto.id}`, 'GET', undefined, 1)).status, 403);
  // Editar una opción después de leer los grupos no mezcla dos cortes de catálogo.
  const hookLectura = `lectura-${marca}`;
  m.ModificadorCatalogo.addHook('afterFind', hookLectura, async () => { await opciones[2].update({ precio_adicional: '7.00' }); });
  try {
    const coherente = await obtenerProductoPos(producto.id);
    assert.equal(coherente.configuracion.grupos[1].opciones.find(o => o.id === opciones[2].id).precio_adicional, '3.00');
    assert.equal((await m.ModificadorItem.findByPk(opciones[2].id)).precio_adicional, '7.00');
  } finally { m.ModificadorCatalogo.removeHook('afterFind', hookLectura); await opciones[2].update({ precio_adicional: '3.00' }); }
  assert.equal((await pedir('/pedidos', 'POST', { ...cuerpo, lineas: [{ ...linea, es_exclusion: true }] })).status, 400);
  const key = randomUUID(), registrada = await pedir('/pedidos', 'POST', cuerpo, 0, key);
  assert.equal(registrada.status, 201, JSON.stringify(registrada.json));
  let pedido = registrada.json.pedido;
  assert.equal(pedido.total_preliminar, '46.00');
  assert.equal(pedido.lineas[0].indicaciones, 'Bien caliente poco ají');
  assert.equal(pedido.lineas[0].modificadores.find(o => o.id === opciones[3].id).es_exclusion, true);
  const item = await m.PedidoItemKds.findByPk(pedido.lineas[0].id), tarea = await m.KdsTarea.findOne({ where: { pedido_item_id: item.id } });
  const seleccionSQL = await m.PedidoItemModificador.findAll({ where: { pedido_item_id: item.id } });
  assert.equal(seleccionSQL.length, 3); assert.equal(seleccionSQL.find(o => o.modificador_id === opciones[2].id).precio_adicional_grabado, '3.00');
  assert.equal(item.notas_preparacion, 'Bien caliente poco ají');
  assert.equal(tarea.snapshot_json.modificadores.find(o => o.id === opciones[3].id).es_exclusion, true);
  const reservas = await m.ReservaInsumo.findAll({ where: { tarea_id: tarea.id } });
  assert.equal(reservas.length, 2);
  assert.equal(reservas.find(r => r.insumo_id === insumos[0].id).cantidad_base, '2.0000');
  assert.equal(reservas.find(r => r.insumo_id === insumos[1].id).cantidad_base, '0.6000');
  assert.ok(!reservas.some(r => r.insumo_id === insumos[2].id));
  // La nota libre no es un comando para descontar un ingrediente.
  const soloNota = (await crearPedido({ tipo_atencion: 'llevar', lineas: [{ productoId: producto.id, modificadoresIds: [opciones[0].id], cantidad: 1, indicaciones: 'Sin queso' }] }, ctx())).pedido;
  const tareaNota = await m.KdsTarea.findOne({ where: { pedido_item_id: soloNota.lineas[0].id } });
  assert.equal(tareaNota.snapshot_json.ingredientes.find(i => i.insumo_id === insumos[1].id).cantidad_bruta_total, '0.2000');
  const hook = `f35-${marca}`, intentos = await m.PedidoMaster.count({ where: { usuario_creador_id: usuarios[0].id } });
  m.PedidoItemModificador.addHook('beforeCreate', hook, () => { throw new Error('fallo seleccion controlado'); });
  try { await assert.rejects(() => crearPedido(cuerpo, ctx()), /fallo seleccion controlado/); }
  finally { m.PedidoItemModificador.removeHook('beforeCreate', hook); }
  assert.equal(await m.PedidoMaster.count({ where: { usuario_creador_id: usuarios[0].id } }), intentos);
  // Cambiar catálogo/BOM no reescribe la preparación ya confirmada.
  const snapshot = structuredClone(tarea.snapshot_json);
  await opciones[3].update({ nombre_modificador: 'Nombre cambiado', es_exclusion: false, precio_adicional: '9.00' });
  await m.RecetaBom.update({ cantidad_bruta_necesaria: '0.7000' }, { where: { producto_venta_id: producto.id, insumo_id: insumos[1].id } });
  const historico = (await consultarPedido(pedido.id)).pedido;
  assert.equal(historico.lineas[0].modificadores.find(o => o.id === opciones[3].id).nombre, 'Sin aceitunas');
  assert.equal(historico.lineas[0].modificadores.find(o => o.id === opciones[3].id).es_exclusion, true);
  assert.deepEqual((await m.KdsTarea.findByPk(tarea.id)).snapshot_json, snapshot);
  assert.deepEqual((await pedir('/pedidos', 'POST', cuerpo, 0, key)).json.pedido, registrada.json.pedido);
  await consumirTarea(tarea.id, { usuarioId: usuarios[1].id }); await consumirTarea(tarea.id, { usuarioId: usuarios[1].id });
  assert.equal((await m.InsumoAlmacen.findByPk(insumos[1].id)).stock_fisico, '4.4000');
  assert.equal((await m.InsumoAlmacen.findByPk(insumos[2].id)).stock_fisico, '1.0000');
  assert.equal(await m.InventarioKardex.count({ where: { referencia_documento: `tarea:${tarea.id}` } }), 2);
  // Ticket: usar la selección histórica, no el catálogo editado.
  caja = await m.CajaFisica.create({ nombre_terminal: `F35 ${marca.slice(0, 8)}`, estado: 'activa' });
  const sesion = (await abrirCaja({ caja_fisica_id: caja.id, apertura_monto_base: '0' }, ctx())).sesion;
  pedido = (await cambiarBloqueoPago(pedido.id, { version: pedido.version }, ctx())).pedido;
  padre = await sequelize.transaction();
  await m.ConfiguracionGlobal.upsert({ parametro_key: 'FINANZAS', valor_json: { igv_porcentaje: '0', precios_incluyen_impuesto: true } }, { transaction: padre });
  const venta = await cobrarPedido(pedido.id, { version: pedido.version, sesion_caja_id: sesion.id, pagos: [{ metodo_pago: 'efectivo', monto_pagado: '46', monto_entregado: '46' }] }, ctx(padre));
  const job = await m.TrabajoImpresion.findOne({ where: { job_uid: venta.venta.impresion.job_uid }, transaction: padre });
  assert.ok(job.contenido_json.lineas[0].modificadores.includes('Excluir: Sin aceitunas'));
  for (const ancho of [58, 80]) assert.ok(formatearTicket(job.contenido_json, ancho).includes('Excluir: Sin aceitunas'));
  await padre.rollback(); padre = null;
  console.log('OK fase 35: grupos asignados, opciones obligatorias/exclusivas, es_exclusion histórico, notas SQL/KDS, deltas exactos, reserva/consumo idempotentes, selección inválida/rollback, edición de catálogo sin alterar snapshot y ticket 58/80 mm.');
} finally {
  if (padre && !padre.finished) await padre.rollback();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  const uids = usuarios.map(u => u.id), pedidos = uids.length ? await m.PedidoMaster.findAll({ where: { usuario_creador_id: uids }, attributes: ['id'] }) : [], pids = pedidos.map(p => p.id);
  const items = pids.length ? await m.PedidoItemKds.findAll({ where: { pedido_id: pids }, attributes: ['id'] }) : [], iids = items.map(i => i.id);
  if (iids.length) {
    const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: iids }, attributes: ['id'] }), tids = tareas.map(t => t.id);
    if (tids.length) { await m.ReservaInsumo.destroy({ where: { tarea_id: tids } }); await m.KdsHistorial.destroy({ where: { tarea_id: tids } }); }
    await m.KdsTarea.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemModificador.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemKds.destroy({ where: { id: iids } });
  }
  if (pids.length) { await m.EventoOutbox.destroy({ where: { entidad: 'pedidos_master', entidad_id: pids } }); await m.PedidoMaster.destroy({ where: { id: pids } }); }
  if (producto) { await m.ProductoModificador.destroy({ where: { producto_id: producto.id } }); await m.RecetaBom.destroy({ where: { producto_venta_id: producto.id } }); await producto.destroy(); }
  if (opciones.length) await m.ModificadorBom.destroy({ where: { modificador_id: opciones.map(o => o.id) } });
  for (const o of opciones) await o.destroy(); for (const g of grupos) await g.destroy();
  if (insumos.length) await m.InventarioKardex.destroy({ where: { insumo_id: insumos.map(i => i.id) } });
  for (const i of insumos) await i.destroy(); for (const u of unidades) await u.destroy();
  if (categoria) await categoria.destroy();
  if (uids.length) { await m.AuditLog.destroy({ where: { usuario_id: uids } }); await m.IdempotenciaOperacion.destroy({ where: { usuario_id: uids } }); await m.AuthSesion.destroy({ where: { usuario_id: uids } }); await m.SesionCajaZ.destroy({ where: { cajero_id: uids } }); }
  if (caja) await caja.destroy(); if (uids.length) await m.Usuario.destroy({ where: { id: uids } });
  await sequelize.close();
}
