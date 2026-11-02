// Pruebas locales con WebSocket real; el worker solo toca eventos temporales propios.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import WebSocket from 'ws';
import { cambiarTareaKds } from '../src/services/kds-comandos.service.js';
import { crearAutorizacion } from '../src/services/autorizaciones.service.js';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { crearPedido } from '../src/services/pedidos.service.js';
import { registrarMovimiento } from '../src/services/inventario.service.js';
import { eventoComercial } from '../src/services/operacion-comercial.js';
import { crearCanalKds } from '../src/realtime/kds.js';
import { publicarLoteKds, iniciarWorkerKds } from '../src/workers/kds-outbox.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], categorias = [], productos = [], sockets = [];
let servidor, canal, padre, worker, unidad, insumo, zona, mesa, grupo, opcion;
const ctx = transaction => ({ usuarioId: usuarios[1].id, clave: randomUUID(), transaction });
const esperar = async fn => { const fin = Date.now() + 5000; while (!fn()) { assert.ok(Date.now() < fin, 'Tiempo de espera KDS agotado'); await new Promise(r => setTimeout(r, 20)); } };
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const nombre of ['cocinero', 'cajero', 'administrador']) {
    const rol = await m.Rol.findOne({ where: { nombre } }); assert.ok(rol);
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Prueba KDS F37', email: `f37-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  unidad = await m.UnidadMedida.create({ nombre: `F37 ${marca}`, abreviatura: 'un' });
  insumo = await m.InsumoAlmacen.create({ nombre: `SECRETO INSUMO F37 ${marca}`, codigo: `F37-${marca}`, unidad_medida_id: unidad.id, activo: true, perecible: false });
  await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: '30', costo_unitario: '1', operacion_uid: `mov:f37:${marca}`, usuario_id: usuarios[1].id });
  for (const [i, nombre] of ['Cocina', 'Despacho'].entries()) {
    const c = await m.CategoriaVenta.create({ nombre: `F37 ${nombre} ${marca}`, slug: `f37-${i}-${marca}`, activa: true, es_para_kds: i === 0 }); categorias.push(c);
    const p = await m.ProductoVenta.create({ nombre: `F37 ${nombre}`, categoria_id: c.id, precio_venta_base: '10.00', tipo_producto: i ? 'producto_directo' : 'plato_preparado', controla_stock: true, insumo_directo_id: i ? insumo.id : null, estado: 'activo' }); productos.push(p);
    if (!i) await m.RecetaBom.create({ producto_venta_id: p.id, insumo_id: insumo.id, cantidad_bruta_necesaria: '1.0000' });
  }
  zona = await m.ZonaRestaurante.create({ nombre: `F37 ${marca.slice(0, 8)}` });
  mesa = await m.MesaSalon.create({ zona_id: zona.id, codigo_mesa: marca.slice(0, 9), estado_actual: 'libre' });
  grupo = await m.ModificadorCatalogo.create({ nombre_grupo: `F37 ${marca.slice(0, 8)}`, es_multiple: true, es_obligatorio: false });
  opcion = await m.ModificadorItem.create({ grupo_id: grupo.id, nombre_modificador: 'Sin ají', es_exclusion: true, precio_adicional: '0.00' });
  await m.ProductoModificador.create({ producto_id: productos[0].id, grupo_id: grupo.id });
  const cuerpo = { tipo_atencion: 'salon', mesa_id: mesa.id, lineas: [{ productoId: productos[0].id, cantidad: 2, modificadoresIds: [opcion.id], indicaciones: 'Presa pecho, sin cebolla' }, { productoId: productos[1].id, cantidad: 1 }] };
  servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  canal = crearCanalKds(servidor, { intervaloMs: 60000 });
  const base = `http://127.0.0.1:${servidor.address().port}/api`, wsBase = `ws://127.0.0.1:${servidor.address().port}`;
  async function login(actor) {
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.origenFrontend, 'X-CSRF-Protection': '1' }, body: JSON.stringify({ email: usuarios[actor].email, password }) });
    assert.equal(r.status, 200); return r.headers.get('set-cookie').split(';')[0];
  }
  const cookies = [await login(0), await login(1)];
  const get = async (ruta, actor = 0) => { const r = await fetch(base + ruta, { headers: actor === null ? {} : { Cookie: cookies[actor] } }); return { status: r.status, json: await r.json(), headers: r.headers }; };
  const rechazarWs = (cookie, origin, path = '/api/kds/ws') => new Promise((resolve, reject) => {
    const ws = new WebSocket(wsBase + path, { headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: origin } }); sockets.push(ws);
    ws.on('error', () => {}); ws.on('unexpected-response', (_r, res) => { res.resume(); ws.terminate(); resolve(res.statusCode); }); ws.on('open', () => reject(new Error('Se aceptó un socket no autorizado')));
  });
  async function conectar(cookie = cookies[0]) {
    const mensajes = [], ws = new WebSocket(wsBase + '/api/kds/ws', { headers: { Cookie: cookie, Origin: env.origenFrontend } }); sockets.push(ws);
    ws.on('error', () => {}); ws.on('message', b => mensajes.push(JSON.parse(String(b))));
    await esperar(() => mensajes.some(m => m.tipo === 'kds.conectado'));
    assert.equal(mensajes[0].requiere_snapshot, true);
    return { ws, mensajes };
  }
  assert.equal((await get('/kds/tareas', null)).status, 401); assert.equal((await get('/kds/tareas', 1)).status, 403);
  assert.equal((await get('/kds/tareas?limite=201')).status, 400);
  assert.equal((await get('/kds/tareas?limite[]=1')).status, 400);
  assert.equal((await get('/kds/tareas/9223372036854775807')).status, 404);
  assert.equal(await rechazarWs(null, env.origenFrontend), 401);
  assert.equal(await rechazarWs(cookies[1], env.origenFrontend), 403);
  assert.equal(await rechazarWs(cookies[0], 'https://origen-no-permitido.invalid'), 403);
  assert.equal(await rechazarWs(cookies[0], env.origenFrontend, '/api/kds/ws?token=no'), 404);

  const conectado = await conectar();
  const post = async (id, datos, clave = randomUUID(), actor = 0, csrf = true) => {
    const r = await fetch(`${base}/kds/tareas/${id}/transiciones`, { method: 'POST', headers: { Cookie: cookies[actor], Origin: env.origenFrontend, 'Content-Type': 'application/json', 'Idempotency-Key': clave, ...(csrf ? { 'X-CSRF-Protection': '1' } : {}) }, body: JSON.stringify(datos) });
    return { status: r.status, json: await r.json() };
  };
  const pedido = (await crearPedido({ tipo_atencion: 'llevar', lineas: [{ productoId: productos[0].id, cantidad: 2, modificadoresIds: [opcion.id], indicaciones: 'Presa pecho' }, { productoId: productos[1].id, cantidad: 1 }, { productoId: productos[0].id, cantidad: 1 }] }, ctx())).pedido;
  const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: pedido.lineas.map(l => l.id) }, order: [['id', 'ASC']] });
  const [cocina, bebida, temprana] = tareas;
  assert.equal((await post(cocina.id, { version: 1, estado: 'preparando' }, randomUUID(), 1)).status, 403);
  assert.equal((await post(cocina.id, { version: 1, estado: 'preparando' }, randomUUID(), 0, false)).status, 403);
  assert.equal((await post(cocina.id, { version: 1, estado: 'entregado' })).status, 409);
  assert.equal((await post(cocina.id, { version: 1, estado: 'preparando', usuarioId: usuarios[1].id })).status, 400);
  const clave = randomUUID(), inicio = { version: 1, estado: 'preparando' };
  const dobles = await Promise.all([post(cocina.id, inicio, clave), post(cocina.id, inicio, clave)]);
  assert.ok(dobles.every(r => r.status === 200)); assert.equal(dobles.filter(r => r.json.repetida).length, 1);
  assert.equal(dobles[0].json.tarea.estado, 'preparando'); assert.equal(dobles[0].json.tarea.indicaciones, 'Presa pecho');
  assert.equal(await m.KdsHistorial.count({ where: { tarea_id: cocina.id } }), 1);
  assert.equal(await m.InventarioKardex.count({ where: { referencia_documento: `tarea:${cocina.id}` } }), 1);
  await insumo.reload(); assert.equal(insumo.stock_fisico, '28.0000'); assert.equal(insumo.stock_reservado, '2.0000');
  assert.equal((await post(cocina.id, { version: 2, estado: 'horno' }, clave)).status, 409);
  assert.equal((await post(cocina.id, inicio)).json.codigo, 'TAREA_KDS_DESACTUALIZADA');
  // Dos identidades concurrentes sobre la misma versión: solo una avanza.
  const carrera = await Promise.all([post(cocina.id, { version: 2, estado: 'horno' }), post(cocina.id, { version: 2, estado: 'listo_para_entrega' })]);
  assert.deepEqual(carrera.map(r => r.status).sort(), [200, 409]);
  let actual = (await get(`/kds/tareas/${cocina.id}`)).json.tarea;
  if (actual.estado === 'horno') { assert.ok(actual.horno_en); actual = (await post(cocina.id, { version: actual.version, estado: 'listo_para_entrega' })).json.tarea; }
  assert.equal(actual.estado, 'listo_para_entrega'); assert.ok(actual.listo_en); assert.equal(actual.entregado_en, null);
  actual = (await post(cocina.id, { version: actual.version, estado: 'entregado' })).json.tarea; assert.ok(actual.entregado_en);
  assert.equal((await m.PedidoItemKds.findByPk(cocina.pedido_item_id)).estado_kanban, 'entregado');
  assert.equal(await m.InventarioKardex.count({ where: { referencia_documento: `tarea:${cocina.id}` } }), 1);
  const despacho = await post(bebida.id, { version: 1, estado: 'entregado' }); assert.equal(despacho.status, 200);
  await insumo.reload(); assert.equal(insumo.stock_fisico, '27.0000');
  const cancelacion = await post(temprana.id, { version: 1, estado: 'cancelado', motivo: 'Error de selección' }); assert.equal(cancelacion.status, 200);
  await insumo.reload(); assert.equal(insumo.stock_fisico, '27.0000'); assert.equal(insumo.stock_reservado, '0.0000');
  assert.equal((await m.ReservaInsumo.findOne({ where: { tarea_id: temprana.id } })).estado, 'liberada');
  // Componentes separados y cancelación tardía sin devolver el consumo.
  const componente = await m.KdsTarea.create({ pedido_item_id: cocina.pedido_item_id, producto_id: productos[0].id, cantidad: 2, componente_numero: 2, snapshot_json: cocina.snapshot_json });
  const { reservarTareas } = await import('../src/services/inventario.service.js'); await reservarTareas([componente.id]);
  assert.equal((await post(componente.id, inicio)).status, 200);
  assert.equal((await m.PedidoItemKds.findByPk(cocina.pedido_item_id)).estado_kanban, 'preparando');
  assert.equal((await post(componente.id, { version: 2, estado: 'cancelado', motivo: 'Error después de preparar' })).json.codigo, 'AUTORIZACION_NO_VALIDA');
  const aprobada = await crearAutorizacion({ aprobadorId: usuarios[2].id, datos: { actorId: usuarios[0].id, accion: 'kds/cancelar', entidad: 'kds_tareas', entidadId: String(componente.id), motivo: 'No entregar preparación' } });
  assert.equal(aprobada.estado, 'creada');
  const cuerpoCancelar = { version: 2, estado: 'cancelado', motivo: 'No entregar preparación', autorizacion_id: aprobada.autorizacion.id };
  // Fallo tardío en el outbox revierte estado, historial y consumo de aprobación.
  const hook = `fallo-${marca}`; m.EventoOutbox.addHook('beforeCreate', hook, () => { throw new Error('Fallo controlado F37'); });
  try { await assert.rejects(cambiarTareaKds(componente.id, cuerpoCancelar, { usuarioId: usuarios[0].id, clave: randomUUID() })); }
  finally { m.EventoOutbox.removeHook('beforeCreate', hook); }
  assert.equal((await m.KdsTarea.findByPk(componente.id)).estado, 'preparando');
  assert.equal((await m.AutorizacionSensible.findByPk(aprobada.autorizacion.id)).consumida_en, null);
  assert.equal((await post(componente.id, cuerpoCancelar)).status, 200);
  assert.equal((await m.PedidoItemKds.findByPk(cocina.pedido_item_id)).estado_kanban, 'entregado');
  assert.ok((await m.AutorizacionSensible.findByPk(aprobada.autorizacion.id)).consumida_en);
  assert.equal((await m.ReservaInsumo.findOne({ where: { tarea_id: componente.id } })).estado, 'consumida');
  await insumo.reload(); assert.equal(insumo.stock_fisico, '25.0000'); assert.equal(insumo.stock_reservado, '0.0000');
  assert.equal(await m.VentaComprobante.count({ where: { pedido_id: pedido.id } }), 0);
  assert.equal((await m.PedidoMaster.findByPk(pedido.id)).total_preliminar, pedido.total_preliminar);
  // Rollback tras consumo: no deja Kardex, reserva consumida ni transición.
  const rollback = await m.KdsTarea.create({ pedido_item_id: cocina.pedido_item_id, producto_id: productos[0].id, cantidad: 2, componente_numero: 3, snapshot_json: cocina.snapshot_json });
  await reservarTareas([rollback.id]);
  m.EventoOutbox.addHook('beforeCreate', hook, () => { throw new Error('Fallo controlado F37'); });
  try { await assert.rejects(cambiarTareaKds(rollback.id, inicio, { usuarioId: usuarios[0].id, clave: randomUUID() })); }
  finally { m.EventoOutbox.removeHook('beforeCreate', hook); }
  assert.equal((await m.KdsTarea.findByPk(rollback.id)).estado, 'espera');
  assert.equal(await m.InventarioKardex.count({ where: { referencia_documento: `tarea:${rollback.id}` } }), 0);
  assert.equal((await m.ReservaInsumo.findOne({ where: { tarea_id: rollback.id } })).estado, 'reservada');
  const eventos = await m.EventoOutbox.findAll({ where: { entidad: 'kds_tareas', entidad_id: tareas.map(t => t.id).concat(String(componente.id)) } });
  assert.ok(eventos.length >= 7);
  assert.equal((await publicarLoteKds({ publicar: canal.publicar, ids: eventos.map(e => e.id) })).publicados, eventos.length);
  await esperar(() => conectado.mensajes.filter(m => m.tipo === 'kds.actualizada').length === eventos.length);
  assert.ok(conectado.mensajes.filter(m => m.tipo === 'kds.actualizada').every(m => ['cocina', 'despacho'].includes(m.canal)));
  console.log('OK fase 37: REST/CSRF/permisos, identidad, concurrencia/versiones, cocina/horno/listo/entrega, consumo único, cancelación temprana/tardía autorizada, rollback completo, componentes y publicación WebSocket.');
} finally {
  if (padre && !padre.finished) await padre.rollback();
  if (worker) await worker.detener();
  for (const s of sockets) s.terminate(); if (canal) await canal.cerrar();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  const uids = usuarios.map(u => u.id), pedidos = uids.length ? await m.PedidoMaster.findAll({ where: { usuario_creador_id: uids }, attributes: ['id'] }) : [], pids = pedidos.map(p => p.id);
  const items = pids.length ? await m.PedidoItemKds.findAll({ where: { pedido_id: pids }, attributes: ['id'] }) : [], iids = items.map(i => i.id);
  if (iids.length) { const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: iids }, attributes: ['id'] }), tids = tareas.map(t => t.id);
    if (tids.length) { await m.AutorizacionSensible.destroy({ where: { entidad: 'kds_tareas', entidad_id: tids } }); await m.EventoOutbox.destroy({ where: { entidad: 'kds_tareas', entidad_id: tids } }); await m.ReservaInsumo.destroy({ where: { tarea_id: tids } }); await m.KdsHistorial.destroy({ where: { tarea_id: tids } }); }
    await m.KdsTarea.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemModificador.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemKds.destroy({ where: { id: iids } }); }
  if (pids.length) { await m.EventoOutbox.destroy({ where: { entidad: 'pedidos_master', entidad_id: pids } }); await m.PedidoMaster.destroy({ where: { id: pids } }); }
  if (mesa) { await m.EventoOutbox.destroy({ where: { entidad: 'mesas_salon', entidad_id: mesa.id } }); await mesa.destroy(); } if (zona) await zona.destroy();
  if (opcion) await opcion.destroy();
  for (const p of productos) { await m.ProductoModificador.destroy({ where: { producto_id: p.id } }); await m.RecetaBom.destroy({ where: { producto_venta_id: p.id } }); await p.destroy(); }
  if (grupo) await grupo.destroy();
  if (insumo) { await m.InventarioKardex.destroy({ where: { insumo_id: insumo.id } }); await insumo.destroy(); } if (unidad) await unidad.destroy();
  for (const c of categorias) await c.destroy();
  if (uids.length) { await m.AuditLog.destroy({ where: { usuario_id: uids } }); await m.IdempotenciaOperacion.destroy({ where: { usuario_id: uids } }); await m.AuthSesion.destroy({ where: { usuario_id: uids } }); await m.Usuario.destroy({ where: { id: uids } }); }
  await sequelize.close();
}
