// Pruebas locales con WebSocket real; el worker solo toca eventos temporales propios.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import WebSocket from 'ws';
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
  for (const nombre of ['cocinero', 'cajero']) {
    const rol = await m.Rol.findOne({ where: { nombre } }); assert.ok(rol);
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Prueba KDS F36', email: `f36-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  unidad = await m.UnidadMedida.create({ nombre: `F36 ${marca}`, abreviatura: 'un' });
  insumo = await m.InsumoAlmacen.create({ nombre: `SECRETO INSUMO F36 ${marca}`, codigo: `F36-${marca}`, unidad_medida_id: unidad.id, activo: true, perecible: false });
  await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: '30', costo_unitario: '1', operacion_uid: `mov:f36:${marca}`, usuario_id: usuarios[1].id });
  for (const [i, nombre] of ['Cocina', 'Despacho'].entries()) {
    const c = await m.CategoriaVenta.create({ nombre: `F36 ${nombre} ${marca}`, slug: `f36-${i}-${marca}`, activa: true, es_para_kds: i === 0 }); categorias.push(c);
    const p = await m.ProductoVenta.create({ nombre: `F36 ${nombre}`, categoria_id: c.id, precio_venta_base: '10.00', tipo_producto: i ? 'producto_directo' : 'plato_preparado', controla_stock: true, insumo_directo_id: i ? insumo.id : null, estado: 'activo' }); productos.push(p);
    if (!i) await m.RecetaBom.create({ producto_venta_id: p.id, insumo_id: insumo.id, cantidad_bruta_necesaria: '1.0000' });
  }
  zona = await m.ZonaRestaurante.create({ nombre: `F36 ${marca.slice(0, 8)}` });
  mesa = await m.MesaSalon.create({ zona_id: zona.id, codigo_mesa: marca.slice(0, 9), estado_actual: 'libre' });
  grupo = await m.ModificadorCatalogo.create({ nombre_grupo: `F36 ${marca.slice(0, 8)}`, es_multiple: true, es_obligatorio: false });
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
  // Antes del commit no hay publicación; un rollback elimina tareas y eventos juntos.
  padre = await sequelize.transaction();
  const provisional = (await crearPedido(cuerpo, ctx(padre))).pedido;
  const previos = await m.EventoOutbox.findAll({ where: { entidad: 'pedidos_master', entidad_id: provisional.id, sala_destino: 'kds' }, transaction: padre });
  assert.equal(previos.length, 2);
  assert.equal((await publicarLoteKds({ publicar: canal.publicar, ids: previos.map(e => e.id) })).publicados, 0);
  await padre.rollback(); padre = null;
  assert.equal(await m.KdsTarea.count({ where: { pedido_item_id: provisional.lineas.map(l => l.id) } }), 0);
  const c = ctx(), pedido = (await crearPedido(cuerpo, c)).pedido;
  assert.equal((await crearPedido(cuerpo, c)).pedido.id, pedido.id);
  const eventos = await m.EventoOutbox.findAll({ where: { entidad: 'pedidos_master', entidad_id: pedido.id, sala_destino: 'kds' } });
  assert.equal(eventos.length, 2); const ids = eventos.map(e => e.id);
  const notificaciones = () => conectado.mensajes.filter(m => eventos.some(e => e.event_uid === m.event_uid));
  const carreras = await Promise.all([publicarLoteKds({ publicar: canal.publicar, ids }), publicarLoteKds({ publicar: canal.publicar, ids })]);
  assert.equal(carreras.reduce((s, r) => s + r.publicados, 0), 2);
  await esperar(() => notificaciones().length === 2);
  assert.equal(new Set(notificaciones().map(n => n.event_uid)).size, 2);
  assert.deepEqual(new Set(notificaciones().map(n => n.canal)), new Set(['cocina', 'despacho']));
  assert.ok(notificaciones().every(n => typeof n.tareas[0] === 'string' && !JSON.stringify(n).includes('SECRETO')));
  assert.equal((await publicarLoteKds({ publicar: canal.publicar, ids })).publicados, 0);
  // Páginas acotadas a las propias tareas; detalles sin costos ni datos del cliente.
  const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: pedido.lineas.map(l => l.id) }, order: [['id', 'ASC']] });
  const desde = String(BigInt(tareas[0].id) - 1n), hasta = String(tareas.at(-1).id), prefijo = `/kds/tareas?limite=1&hasta=${hasta}`;
  const a = await get(prefijo + (desde === '0' ? '' : `&desde=${desde}`));
  assert.equal(a.status, 200); assert.equal(a.headers.get('cache-control'), 'no-store'); assert.equal(a.json.tareas.length, 1); assert.ok(a.json.paginacion.siguiente);
  const b = await get(prefijo + `&desde=${a.json.paginacion.siguiente}`);
  assert.equal(b.json.tareas.length, 1); assert.equal(b.json.paginacion.siguiente, null);
  const cocina = a.json.tareas[0]; assert.equal(cocina.cantidad, 2); assert.equal(cocina.indicaciones, 'Presa pecho, sin cebolla');
  assert.equal(cocina.modificadores[0].es_exclusion, true); assert.equal(cocina.pedido.mesa.codigo, mesa.codigo_mesa);
  assert.ok(!JSON.stringify(cocina).includes('SECRETO') && !Object.hasOwn(cocina, 'ingredientes'));
  const despacho = await get(prefijo + `&desde=${desde}&canal=despacho`); assert.equal(despacho.json.tareas.length, 1); assert.equal(despacho.json.tareas[0].canal, 'despacho');
  // Una línea puede tener componentes separados sin crear otro ingreso/venta.
  const componente = await m.KdsTarea.create({ pedido_item_id: tareas[0].pedido_item_id, producto_id: productos[0].id, cantidad: 1, componente_numero: 2, snapshot_json: tareas[0].snapshot_json });
  const componenteHttp = await get(`/kds/tareas/${componente.id}`); assert.equal(componenteHttp.json.tarea.componente_numero, 2);
  assert.equal(await m.VentaComprobante.count({ where: { pedido_id: pedido.id } }), 0);
  await componente.update({ estado: 'entregado', version: 2, entregado_en: new Date() });
  assert.equal((await get(`/kds/tareas/${componente.id}`)).json.tarea.estado, 'entregado');
  assert.equal((await get(`/kds/tareas?desde=${BigInt(componente.id) - 1n}&hasta=${componente.id}`)).json.tareas.length, 0);
  const ajeno = await sequelize.transaction(tx => eventoComercial('pedido.confirmado', 'pedidos_master', pedido.id, 1, {}, tx));
  assert.equal((await publicarLoteKds({ ids: [ajeno.id], publicar: canal.publicar })).publicados, 0);
  assert.equal((await m.EventoOutbox.findByPk(ajeno.id)).publicado_en, null);
  const hookRegistro = `registro-${marca}`;
  m.EventoOutbox.addHook('beforeCreate', hookRegistro, e => { if (e.tipo === 'pedido.cocina') throw new Error('fallo evento KDS controlado'); });
  const numero = await m.KdsTarea.count({ where: { producto_id: productos.map(p => p.id) } });
  try { await assert.rejects(() => crearPedido({ ...cuerpo, tipo_atencion: 'llevar', mesa_id: null }, ctx()), /fallo evento KDS controlado/); }
  finally { m.EventoOutbox.removeHook('beforeCreate', hookRegistro); }
  assert.equal(await m.KdsTarea.count({ where: { producto_id: productos.map(p => p.id) } }), numero);
  async function nuevoEvento(payload = { pedido_id: pedido.id, tareas: [String(tareas[0].id)] }) {
    return sequelize.transaction(tx => eventoComercial('pedido.cocina', 'pedidos_master', pedido.id, 1, payload, tx));
  }
  const reintento = await nuevoEvento(), vistos = [], ahora = new Date();
  assert.equal((await publicarLoteKds({ ids: [reintento.id], ahora, publicar: async () => { throw new Error('transporte temporal'); } })).fallidos, 1);
  assert.equal((await m.EventoOutbox.findByPk(reintento.id)).publicado_en, null);
  assert.equal((await publicarLoteKds({ ids: [reintento.id], ahora, publicar: async n => vistos.push(n.event_uid) })).publicados, 0);
  const siguienteReintento = (await m.EventoOutbox.findByPk(reintento.id)).proximo_intento_en;
  assert.equal((await publicarLoteKds({ ids: [reintento.id], ahora: siguienteReintento, publicar: async n => vistos.push(n.event_uid) })).publicados, 1);
  assert.deepEqual(vistos, [reintento.event_uid]);
  // Entrega lograda pero marca fallida: repetir UID, no prometer exactly-once.
  const ackPerdido = await nuevoEvento(), recibidos = []; let primera = true;
  const hookAck = `ack-${marca}`;
  m.EventoOutbox.addHook('beforeUpdate', hookAck, e => { if (String(e.id) === String(ackPerdido.id) && e.publicado_en && primera) { primera = false; throw new Error('fallo marca controlado'); } });
  try { assert.equal((await publicarLoteKds({ ids: [ackPerdido.id], ahora, publicar: async n => recibidos.push(n.event_uid) })).fallidos, 1); }
  finally { m.EventoOutbox.removeHook('beforeUpdate', hookAck); }
  assert.equal((await m.EventoOutbox.findByPk(ackPerdido.id)).publicado_en, null);
  await publicarLoteKds({ ids: [ackPerdido.id], ahora: (await m.EventoOutbox.findByPk(ackPerdido.id)).proximo_intento_en, publicar: async n => recibidos.push(n.event_uid) });
  assert.equal(recibidos.length, 2); assert.equal(new Set(recibidos).size, 1);
  const corrupto = await nuevoEvento({ pedido_id: pedido.id, tareas: [] }), valido = await nuevoEvento();
  const lote = await publicarLoteKds({ ids: [corrupto.id, valido.id], publicar: async () => {} }); assert.deepEqual(lote, { publicados: 1, fallidos: 1 });
  // Detener espera un envío en curso; no cerrar MySQL con el worker activo.
  const ultimo = await nuevoEvento(); let liberar, entro, terminado = false;
  const barrera = new Promise(r => { liberar = r; }), iniciado = new Promise(r => { entro = r; });
  worker = iniciarWorkerKds({ ids: [ultimo.id], intervaloMs: 10, publicar: async () => { entro(); await barrera; } });
  await iniciado; const detener = worker.detener().then(() => { terminado = true; });
  await new Promise(r => setTimeout(r, 20)); assert.equal(terminado, false); liberar(); await detener; worker = null;
  // Reconectar exige snapshot y no depende de reproducir el historial del socket.
  conectado.ws.close(); const reconectado = await conectar();
  assert.equal((await get(`/kds/tareas/${tareas[0].id}`)).status, 200);
  // No aceptar comandos de preparación por el socket de avisos.
  const antesEstado = (await m.KdsTarea.findByPk(tareas[0].id)).estado;
  const cierreMensaje = new Promise(r => reconectado.ws.once('close', r)); reconectado.ws.send(JSON.stringify({ accion: 'consumir', tarea: String(tareas[0].id) })); assert.equal(await cierreMensaje, 1008);
  assert.equal((await m.KdsTarea.findByPk(tareas[0].id)).estado, antesEstado);
  const revocado = await conectar(); const cierreRevocado = new Promise(r => revocado.ws.once('close', r));
  await m.AuthSesion.update({ revocada_en: new Date() }, { where: { usuario_id: usuarios[0].id } });
  await canal.publicar({ tipo: 'prueba_no_debe_llegar' }); assert.equal(await cierreRevocado, 1008); assert.ok(!revocado.mensajes.some(n => n.tipo === 'prueba_no_debe_llegar'));
  cookies[0] = await login(0); const sinPermiso = await conectar(); const cierrePermiso = new Promise(r => sinPermiso.ws.once('close', r));
  const rolOriginal = usuarios[0].rol_id; await usuarios[0].update({ rol_id: usuarios[1].rol_id });
  await canal.verificarConexiones(); assert.equal(await cierrePermiso, 1008); assert.equal((await get('/kds/tareas')).status, 403);
  await usuarios[0].update({ rol_id: rolOriginal });
  const vencido = await conectar(); const cierreVencido = new Promise(r => vencido.ws.once('close', r));
  await m.AuthSesion.update({ expira_en: new Date(Date.now() - 1000) }, { where: { usuario_id: usuarios[0].id } });
  await canal.verificarConexiones(); assert.equal(await cierreVencido, 1008);
  // Esperar una autenticación en curso antes de autorizar el cierre del pool.
  cookies[0] = await login(0); let liberarAuth, comenzoAuth;
  const esperaAuth = new Promise(r => { liberarAuth = r; }), inicioAuth = new Promise(r => { comenzoAuth = r; });
  const hookAuth = `auth-${marca}`;
  m.AuthSesion.addHook('beforeFind', hookAuth, async () => { comenzoAuth(); await esperaAuth; });
  try {
    const ws = new WebSocket(wsBase + '/api/kds/ws', { headers: { Cookie: cookies[0], Origin: env.origenFrontend } }); sockets.push(ws); ws.on('error', () => {});
    await inicioAuth; let cerrado = false;
    const cierre = canal.cerrar().then(() => { cerrado = true; });
    await new Promise(r => setTimeout(r, 20)); assert.equal(cerrado, false);
    liberarAuth(); await cierre;
  } finally { liberarAuth(); m.AuthSesion.removeHook('beforeFind', hookAuth); }
  console.log('OK fase 36: WebSocket autenticado/origen/permiso, rollback y commit, cocina/despacho, publicación concurrente, reintento/UID duplicado, snapshot paginado y componentes, privacidad, reconexión, revocación/rol/vencimiento y cierre ordenado.');
} finally {
  if (padre && !padre.finished) await padre.rollback();
  if (worker) await worker.detener();
  for (const s of sockets) s.terminate(); if (canal) await canal.cerrar();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  const uids = usuarios.map(u => u.id), pedidos = uids.length ? await m.PedidoMaster.findAll({ where: { usuario_creador_id: uids }, attributes: ['id'] }) : [], pids = pedidos.map(p => p.id);
  const items = pids.length ? await m.PedidoItemKds.findAll({ where: { pedido_id: pids }, attributes: ['id'] }) : [], iids = items.map(i => i.id);
  if (iids.length) { const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: iids }, attributes: ['id'] }), tids = tareas.map(t => t.id);
    if (tids.length) { await m.ReservaInsumo.destroy({ where: { tarea_id: tids } }); await m.KdsHistorial.destroy({ where: { tarea_id: tids } }); }
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
