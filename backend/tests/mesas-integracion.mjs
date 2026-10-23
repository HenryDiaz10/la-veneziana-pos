// Integración local. Datos propios y política fiscal solo en transacción revertida.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { cambiarMesa, consultarMesaSalon } from '../src/services/mesas.service.js';
import { crearPedido, ampliarPedido, cambiarBloqueoPago, consultarPedido } from '../src/services/pedidos.service.js';
import { abrirCaja } from '../src/services/caja.service.js';
import { cobrarPedido } from '../src/services/cobros.service.js';
import { registrarMovimiento } from '../src/services/inventario.service.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], mesas = [];
let zona, categoria, unidad, insumo, producto, caja, servidor, padre;
const ctx = (i = 0, transaction) => ({ usuarioId: usuarios[i].id, clave: randomUUID(), transaction });
const rechaza = (fn, codigo) => assert.rejects(async () => fn(), e => e.codigo === codigo, `Esperado ${codigo}`);
const detalle = async mesa => (await consultarMesaSalon(mesa.id)).mesa;
const comando = async mesa => ({ revision: (await detalle(mesa)).revision, motivo: 'Clientes se retiraron sin pedir' });
const nuevoPedido = mesa => ({ tipo_atencion: 'salon', mesa_id: mesa.id, lineas: [{ productoId: producto.id, cantidad: 1 }] });
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const [i, nombre] of ['mesero', 'mesero', 'cajero', 'cocinero'].entries()) {
    const rol = await m.Rol.findOne({ where: { nombre } }); assert.ok(rol);
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Prueba mesa F34', email: `f34-${i}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  zona = await m.ZonaRestaurante.create({ nombre: `F34 ${marca.slice(0, 8)}`, aforo_maximo: 30 });
  for (let i = 0; i < 8; i++) mesas.push(await m.MesaSalon.create({ zona_id: zona.id, codigo_mesa: `${marca.slice(0, 7)}${i}`, estado_actual: i === 7 ? 'inhabilitada' : 'libre' }));
  categoria = await m.CategoriaVenta.create({ nombre: `F34 ${marca}`, slug: `f34-${marca}`, activa: true, es_para_kds: false });
  unidad = await m.UnidadMedida.create({ nombre: `F34 ${marca}`, abreviatura: 'un' });
  insumo = await m.InsumoAlmacen.create({ nombre: `F34 ${marca}`, codigo: `F34-${marca}`, unidad_medida_id: unidad.id, activo: true, perecible: false });
  await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: '30', costo_unitario: '1', operacion_uid: `mov:f34:${marca}`, usuario_id: usuarios[0].id, referencia_documento: 'Fixture F34' });
  producto = await m.ProductoVenta.create({ nombre: `F34 ${marca}`, categoria_id: categoria.id, precio_venta_base: '10.00', tipo_producto: 'producto_directo', controla_stock: true, insumo_directo_id: insumo.id, estado: 'activo' });
  caja = await m.CajaFisica.create({ nombre_terminal: `F34 ${marca.slice(0, 8)}`, estado: 'activa' });
  const sesion = (await abrirCaja({ caja_fisica_id: caja.id, apertura_monto_base: '0' }, ctx(2))).sesion;
  servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}/api`, cookies = [];
  async function pedir(ruta, method = 'GET', datos, actor = 0, csrf = true, key = randomUUID()) {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
    if (cookies[actor]) headers.Cookie = cookies[actor];
    if (csrf) { headers.Origin = env.origenFrontend; headers['X-CSRF-Protection'] = '1'; }
    const r = await fetch(base + ruta, { method, headers, body: datos === undefined ? undefined : JSON.stringify(datos) });
    return { status: r.status, json: await r.json() };
  }
  for (const u of usuarios) {
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.origenFrontend, 'X-CSRF-Protection': '1' }, body: JSON.stringify({ email: u.email, password }) });
    assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]);
  }
  const ruta = `/salon/mesas/${mesas[0].id}`, inicial = await comando(mesas[0]), key = randomUUID();
  assert.equal((await pedir('/salon/mesas/01')).status, 400);
  assert.equal((await pedir('/salon/mesas/2147483647')).status, 404);
  assert.equal((await pedir(ruta, 'GET', undefined, 3)).status, 403);
  assert.equal((await pedir(ruta + '/ocupar', 'POST', inicial, 0, false)).status, 403);
  assert.equal((await pedir(ruta + '/ocupar', 'POST', { ...inicial, mesero_asignado_id: usuarios[1].id })).status, 400);
  const r = await pedir(ruta + '/ocupar', 'POST', inicial, 0, true, key);
  assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.mesa.mesero_asignado_id, usuarios[0].id);
  const repetida = await pedir(ruta + '/ocupar', 'POST', inicial, 0, true, key);
  assert.deepEqual(repetida.json.mesa, r.json.mesa);
  assert.equal((await pedir(ruta + '/ocupar', 'POST', { ...inicial, motivo: 'Otro' }, 0, true, key)).json.codigo, 'IDEMPOTENCIA_EN_CONFLICTO');
  assert.equal((await pedir(`/salon/operaciones/mesa.ocupar/${key}`)).json.mesa.id, mesas[0].id);
  assert.equal((await pedir(`/salon/operaciones/mesa.ocupar/${key}`, 'GET', undefined, 1)).status, 404);
  assert.equal((await pedir(`/salon/operaciones/pedido.crear/${key}`)).status, 400);
  assert.equal((await pedir(`/salon/operaciones/mesa.ocupar/${key}/resolver`, 'POST', {})).json.mesa.id, mesas[0].id);
  assert.equal(await m.EventoOutbox.count({ where: { entidad: 'mesas_salon', entidad_id: mesas[0].id } }), 1);
  assert.ok((await pedir('/pedidos/registro')).json.mesas.some(m => m.id === mesas[0].id));
  assert.ok(!(await pedir('/pedidos/registro', 'GET', undefined, 1)).json.mesas.some(m => m.id === mesas[0].id));
  assert.equal((await pedir(ruta + '/liberar', 'POST', { revision: r.json.mesa.revision })).status, 400);
  await cambiarMesa(mesas[0].id, 'liberar', await comando(mesas[0]), ctx());
  assert.equal((await detalle(mesas[0])).estado_actual, 'sucia_por_limpiar');
  const antesLimpieza = await comando(mesas[0]);
  const limpiezas = await Promise.allSettled([cambiarMesa(mesas[0].id, 'limpiar', antesLimpieza, ctx()), cambiarMesa(mesas[0].id, 'limpiar', antesLimpieza, ctx(1))]);
  assert.equal(limpiezas.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await detalle(mesas[0])).mesero_asignado_id, null);
  assert.notEqual((await detalle(mesas[0])).revision, inicial.revision);
  await rechaza(() => cambiarMesa(mesas[0].id, 'ocupar', inicial, ctx()), 'MESA_DESACTUALIZADA');
  // Recuperación cancela una identidad que no llegó y prohíbe ejecutarla después.
  const cancelada = randomUUID();
  assert.equal((await pedir(`/salon/operaciones/mesa.ocupar/${cancelada}/resolver`, 'POST', {})).json.cancelada, true);
  assert.equal((await pedir(ruta + '/ocupar', 'POST', await comando(mesas[0]), 0, true, cancelada)).json.codigo, 'OPERACION_CANCELADA');
  const libre = await comando(mesas[1]);
  const ocupaciones = await Promise.allSettled([cambiarMesa(mesas[1].id, 'ocupar', libre, ctx()), cambiarMesa(mesas[1].id, 'ocupar', libre, ctx(1))]);
  assert.equal(ocupaciones.filter(r => r.status === 'fulfilled').length, 1);
  const mismaClave = ctx(), b2 = await comando(mesas[2]);
  const dobles = await Promise.all([cambiarMesa(mesas[2].id, 'ocupar', b2, mismaClave), cambiarMesa(mesas[2].id, 'ocupar', b2, mismaClave)]);
  assert.deepEqual(dobles[0].mesa, dobles[1].mesa);
  await rechaza(() => crearPedido(nuevoPedido(mesas[2]), ctx(1)), 'MESA_NO_DISPONIBLE');
  // Fallo tardío revierte mesa, auditoría, evento e identidad de operación.
  const hook = `mesa-${marca}`, fallida = ctx(), antes = await detalle(mesas[2]);
  const auditorias = await m.AuditLog.count({ where: { entidad_afectada: 'mesas_salon', entidad_id: mesas[2].id } });
  m.EventoOutbox.addHook('beforeCreate', hook, e => { if (e.tipo === 'mesa.liberar') throw new Error('fallo mesa controlado'); });
  try { await assert.rejects(() => cambiarMesa(mesas[2].id, 'liberar', { revision: antes.revision, motivo: 'Clientes se retiran' }, fallida), /fallo mesa controlado/); }
  finally { m.EventoOutbox.removeHook('beforeCreate', hook); }
  assert.deepEqual(await detalle(mesas[2]), antes);
  assert.equal(await m.AuditLog.count({ where: { entidad_afectada: 'mesas_salon', entidad_id: mesas[2].id } }), auditorias);
  assert.equal(await m.IdempotenciaOperacion.count({ where: { usuario_id: usuarios[0].id, clave: fallida.clave } }), 0);
  // Cuenta real: asignación, ampliación propia y bloqueo de liberación/limpieza.
  let pedido = (await crearPedido(nuevoPedido(mesas[3]), ctx())).pedido;
  assert.equal((await detalle(mesas[3])).mesero_asignado_id, usuarios[0].id);
  assert.equal((await detalle(mesas[3])).pedido_abierto.id, pedido.id);
  await rechaza(() => crearPedido(nuevoPedido(mesas[3]), ctx(1)), 'MESA_CON_CUENTA_ACTIVA');
  await rechaza(() => ampliarPedido(pedido.id, { version: pedido.version, lineas: nuevoPedido(mesas[3]).lineas }, ctx(1)), 'MESA_NO_ASIGNADA');
  const antesAmpliar = (await detalle(mesas[3])).revision;
  pedido = (await ampliarPedido(pedido.id, { version: pedido.version, lineas: nuevoPedido(mesas[3]).lineas }, ctx())).pedido;
  assert.notEqual((await detalle(mesas[3])).revision, antesAmpliar);
  const mapaActual = (await pedir('/salon')).json.mesas.find(m => m.id === mesas[3].id);
  assert.deepEqual(mapaActual, await detalle(mesas[3]));
  for (const accion of ['liberar', 'limpiar']) await rechaza(() => cambiarMesa(mesas[3].id, accion, { revision: '', motivo: 'No debe liberar' }, ctx()), 'DATOS_INVALIDOS');
  await rechaza(async () => cambiarMesa(mesas[3].id, 'liberar', await comando(mesas[3]), ctx()), 'MESA_CON_CUENTA_ACTIVA');
  await assert.rejects(() => m.PedidoMaster.create({ codigo_pedido: `F34-${randomUUID().slice(0, 12)}`, tipo_atencion: 'salon', mesa_id: mesas[3].id, usuario_creador_id: usuarios[1].id }), e => e.name === 'SequelizeUniqueConstraintError');
  pedido = (await cambiarBloqueoPago(pedido.id, { version: pedido.version }, ctx(2))).pedido;
  assert.equal((await detalle(mesas[3])).pedido_abierto.estado_cuenta, 'bloqueada_en_pago');
  await rechaza(async () => cambiarMesa(mesas[3].id, 'limpiar', await comando(mesas[3]), ctx()), 'MESA_CON_CUENTA_ACTIVA');
  // Checkout vencido conserva la cuenta: nunca equivale a pagar o liberar mesa.
  await m.PedidoMaster.update({ bloqueo_hasta: new Date(Date.now() - 1000) }, { where: { id: pedido.id } });
  await rechaza(async () => cambiarMesa(mesas[3].id, 'liberar', await comando(mesas[3]), ctx()), 'MESA_CON_CUENTA_ACTIVA');
  pedido = (await consultarPedido(pedido.id)).pedido;
  assert.equal(pedido.estado_cuenta, 'abierta');
  pedido = (await cambiarBloqueoPago(pedido.id, { version: pedido.version }, ctx(2))).pedido;
  assert.ok(!(await pedir('/pedidos/registro')).json.mesas.some(m => m.id === mesas[3].id));
  // Ocupar y registrar por otro actor compiten por la misma mesa: uno solo gana.
  const baseCarrera = await comando(mesas[4]);
  const carrera = await Promise.allSettled([cambiarMesa(mesas[4].id, 'ocupar', baseCarrera, ctx(1)), crearPedido(nuevoPedido(mesas[4]), ctx())]);
  assert.equal(carrera.filter(r => r.status === 'fulfilled').length, 1);
  // Una ocupación previa propia puede convertirse en pedido, sin cuenta vacía.
  await cambiarMesa(mesas[5].id, 'ocupar', await comando(mesas[5]), ctx());
  const revisionLiberar = await comando(mesas[5]);
  const carreraLiberar = await Promise.allSettled([crearPedido(nuevoPedido(mesas[5]), ctx()), cambiarMesa(mesas[5].id, 'liberar', revisionLiberar, ctx(1))]);
  assert.equal(carreraLiberar.filter(r => r.status === 'fulfilled').length, 1);
  // Un error de producto revierte la ocupación automática y su auditoría.
  const sinPedido = await detalle(mesas[6]);
  await rechaza(() => crearPedido({ ...nuevoPedido(mesas[6]), lineas: [{ productoId: 2147483647, cantidad: 1 }] }, ctx()), 'PRODUCTO_NO_DISPONIBLE');
  assert.deepEqual(await detalle(mesas[6]), sinPedido);
  await cambiarMesa(mesas[6].id, 'ocupar', await comando(mesas[6]), ctx());
  const pedidoPropioHttp = await pedir('/pedidos', 'POST', nuevoPedido(mesas[6]));
  assert.equal(pedidoPropioHttp.status, 201, JSON.stringify(pedidoPropioHttp.json));
  assert.equal((await detalle(mesas[6])).pedido_abierto.id, pedidoPropioHttp.json.pedido.id);
  await rechaza(async () => cambiarMesa(mesas[7].id, 'ocupar', await comando(mesas[7]), ctx()), 'TRANSICION_MESA_NO_VALIDA');
  // Política fiscal ficticia visible solo dentro de esta transacción padre.
  padre = await sequelize.transaction();
  await m.ConfiguracionGlobal.upsert({ parametro_key: 'FINANZAS', valor_json: { igv_porcentaje: '0', precios_incluyen_impuesto: true, puntos_vip_modo: 'por_sol', puntos_vip_por_sol: 1 } }, { transaction: padre });
  const pago = { version: pedido.version, sesion_caja_id: sesion.id, pagos: [{ metodo_pago: 'efectivo', monto_pagado: '20', monto_entregado: '20' }] };
  // Si falla imprimir, también se revierte el cambio a sucia_por_limpiar.
  const hookTicket = `ticket-${marca}`;
  m.TrabajoImpresion.addHook('beforeCreate', hookTicket, () => { throw new Error('fallo ticket mesa controlado'); });
  try { await assert.rejects(() => cobrarPedido(pedido.id, pago, ctx(2, padre)), /fallo ticket mesa controlado/); }
  finally { m.TrabajoImpresion.removeHook('beforeCreate', hookTicket); }
  assert.equal((await m.MesaSalon.findByPk(mesas[3].id, { transaction: padre })).estado_actual, 'ocupada');
  assert.equal(await m.VentaComprobante.count({ where: { pedido_id: pedido.id }, transaction: padre }), 0);
  await cobrarPedido(pedido.id, pago, ctx(2, padre));
  const cerrada = await m.MesaSalon.findByPk(mesas[3].id, { transaction: padre });
  assert.equal(cerrada.estado_actual, 'sucia_por_limpiar'); assert.equal(cerrada.mesero_asignado_id, usuarios[0].id);
  const audit = await m.AuditLog.findOne({ where: { entidad_afectada: 'mesas_salon', entidad_id: mesas[3].id }, order: [['id', 'DESC']], transaction: padre });
  const { revisionMesa } = await import('../src/services/mesas-reglas.js');
  await cambiarMesa(cerrada.id, 'limpiar', { revision: revisionMesa(cerrada, null, audit.id) }, ctx(1, padre));
  assert.equal((await m.MesaSalon.findByPk(mesas[3].id, { transaction: padre })).mesero_asignado_id, null);
  await padre.rollback(); padre = null;
  assert.equal((await detalle(mesas[3])).estado_actual, 'ocupada');
  console.log('OK fase 34: HTTP/CSRF/permisos, ciclo ocupar/liberar/limpiar, asignación, cuenta única, revisión anti-ciclos, idempotencia/recuperación, ampliación propia, carreras reales, rollback tardío y cobro->sucia->limpieza sin cambiar FINANZAS real.');
} finally {
  if (padre && !padre.finished) await padre.rollback();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  const uids = usuarios.map(u => u.id);
  const pedidos = uids.length ? await m.PedidoMaster.findAll({ where: { usuario_creador_id: uids }, attributes: ['id'] }) : [], pids = pedidos.map(p => p.id);
  const items = pids.length ? await m.PedidoItemKds.findAll({ where: { pedido_id: pids }, attributes: ['id'] }) : [], iids = items.map(i => i.id);
  if (iids.length) {
    const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: iids }, attributes: ['id'] }), tids = tareas.map(t => t.id);
    if (tids.length) { await m.ReservaInsumo.destroy({ where: { tarea_id: tids } }); await m.KdsHistorial.destroy({ where: { tarea_id: tids } }); }
    await m.KdsTarea.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemModificador.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemKds.destroy({ where: { id: iids } });
  }
  if (pids.length) { await m.EventoOutbox.destroy({ where: { entidad: 'pedidos_master', entidad_id: pids } }); await m.PedidoMaster.destroy({ where: { id: pids } }); }
  if (mesas.length) await m.EventoOutbox.destroy({ where: { entidad: 'mesas_salon', entidad_id: mesas.map(m => m.id) } });
  for (const mesa of mesas) await mesa.destroy(); if (zona) await zona.destroy();
  if (producto) await producto.destroy();
  if (insumo) { await m.InventarioKardex.destroy({ where: { insumo_id: insumo.id } }); await insumo.destroy(); }
  if (unidad) await unidad.destroy(); if (categoria) await categoria.destroy();
  if (uids.length) { await m.AuditLog.destroy({ where: { usuario_id: uids } }); await m.IdempotenciaOperacion.destroy({ where: { usuario_id: uids } }); await m.AuthSesion.destroy({ where: { usuario_id: uids } }); await m.SesionCajaZ.destroy({ where: { cajero_id: uids } }); }
  if (caja) await caja.destroy(); if (uids.length) await m.Usuario.destroy({ where: { id: uids } });
  await sequelize.close();
}
