import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Usuario, Rol, AuthSesion, CategoriaVenta, ProductoVenta, UnidadMedida, InsumoAlmacen,
  PedidoMaster, PedidoItemKds, KdsTarea, ReservaInsumo, InventarioKardex } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { registrarMovimiento, reservarTareas } from '../src/services/inventario.service.js';
assert.ok(env.entorno !== 'production' && ['127.0.0.1','localhost','::1'].includes(env.database.host), 'Solo se admite MySQL local de desarrollo.');
const marca = randomUUID(), codigo = `f24-${marca.slice(0, 8)}`;
const usuarios = [], insumos = [], productos = [];
let categoria, unidad, pedido, item, tarea, servidor, archivo;
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const nombre of ['administrador', 'cajero']) {
    const rol = await Rol.findOne({ where: { nombre } });
    const u = await Usuario.create({ nombre_completo: 'Prueba temporal almacén', email: `f24-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' });
    usuarios.push({ id: u.id, email: u.email, password });
  }
  categoria = await CategoriaVenta.create({ nombre: `Prueba almacén ${codigo}`, slug: `f24-${marca}` });
  unidad = await UnidadMedida.create({ nombre: `Unidad F24 ${marca}`, abreviatura: 'un' });
  for (let n = 0; n < 25; n++) insumos.push(await InsumoAlmacen.create({ nombre: n === 0 ? 'Gaseosa de prueba F24' : n === 1 ? 'Insumo inactivo F24' : n === 2 ? 'Quiebre de prueba F24' : `Insumo de prueba F24 ${n}`,
    codigo: `${codigo}-${n}`, unidad_medida_id: unidad.id, activo: n !== 1, quiebre_declarado: n === 2, stock_minimo_alerta: n === 0 ? '3.0000' : '0.0000' }));
  const i = insumos[0];
  for (const tipo of ['producto_directo', 'plato_preparado']) productos.push(await ProductoVenta.create({ nombre: tipo === 'producto_directo' ? 'Bebida de demostración F24' : 'Plato de prueba F24', categoria_id: categoria.id,
    sku: `${codigo}-${tipo}`, tipo_producto: tipo, precio_venta_base: '5.00', ...(tipo === 'producto_directo' ? { insumo_directo_id: i.id, controla_stock: true, stock_actual: '999' } : {}) }));
  for (const [n, cantidad, costo] of [[1, '10', '3'], [2, '2', '4']]) await registrarMovimiento({ insumo_id: i.id, tipo_transaccion: 'INGRESO_COMPRA', cantidad, costo_unitario: costo,
    operacion_uid: `mov:${codigo}-${n}`, usuario_id: usuarios[0].id, referencia_documento: `Compra de prueba ${n}` });
  pedido = await PedidoMaster.create({ codigo_pedido: `F24-${marca.slice(0,12)}`, tipo_atencion: 'llevar', usuario_creador_id: usuarios[0].id });
  item = await PedidoItemKds.create({ pedido_id: pedido.id, producto_venta_id: productos[0].id, cantidad: 2, precio_unitario_grabado: '5', subtotal_item: '10', snapshot_item_json: { prueba: marca } });
  tarea = await KdsTarea.create({ pedido_item_id: item.id, producto_id: productos[0].id, cantidad: 2, snapshot_json: { version: 1, producto_venta_id: productos[0].id, variante_id: null, cantidad: 2,
    ingredientes: [{ insumo_id: i.id, unidad_medida_id: unidad.id, unidad: 'un', cantidad_bruta_unitaria: '1.0000', cantidad_bruta_total: '2.0000' }] } });
  await reservarTareas([tarea.id]);
  await registrarMovimiento({ insumo_id: i.id, tipo_transaccion: 'SALIDA_MERMA', cantidad: '8', operacion_uid: `mov:${codigo}-salida`, usuario_id: usuarios[0].id, referencia_documento: 'Merma de prueba' });
  servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origen = `http://127.0.0.1:${servidor.address().port}`;
  async function pedir(ruta, cookie, method = 'GET', datos) {
    const headers = { Origin: env.origenFrontend, 'X-CSRF-Protection': '1' };
    if (cookie) headers.Cookie = cookie;
    if (datos) headers['Content-Type'] = 'application/json';
    const r = await fetch(`${origen}/api${ruta}`, { method, headers, body: datos ? JSON.stringify(datos) : undefined });
    return { status: r.status, json: await r.json(), headers: r.headers };
  }
  const cookies = [];
  for (const u of usuarios) { const r = await pedir('/auth/login', null, 'POST', { email: u.email, password }); assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]); }
  const cookie = cookies[0];
  assert.equal((await pedir('/inventario')).status, 401);
  assert.equal((await pedir('/inventario', cookies[1])).status, 403);
  assert.equal((await pedir(`/inventario/${i.id}`, cookies[1])).status, 403);
  assert.equal((await pedir(`/inventario/productos/${productos[0].id}`, cookies[1])).status, 403);
  for (const q of ['pagina=0', 'pagina=10001', 'limite=51', 'pagina=1&pagina=2', 'alerta=constructor', 'alerta=__proto__', 'busqueda[x]=1', 'otro=1'])
    assert.equal((await pedir(`/inventario?${q}`, cookie)).status, 400, q);
  const lista = await pedir(`/inventario?busqueda=${codigo}`, cookie);
  assert.equal(lista.status, 200); assert.equal(lista.json.insumos.length, 20); assert.equal(lista.json.paginacion.total, 25);
  assert.equal(lista.headers.get('cache-control'), 'no-store');
  assert.equal((await pedir(`/inventario?busqueda=${codigo}&pagina=2`, cookie)).json.insumos.length, 5);
  const primero = lista.json.insumos.find(r => r.id === i.id);
  assert.equal(primero.stock_fisico, '4.0000'); assert.equal(primero.stock_reservado, '2.0000'); assert.equal(primero.disponible, '2.0000'); assert.equal(primero.alerta, 'bajo');
  assert.equal((await pedir(`/inventario?busqueda=${codigo}&alerta=quiebre`, cookie)).json.insumos[0].id, insumos[2].id);
  assert.equal((await pedir(`/inventario?busqueda=${codigo}&alerta=bajo`, cookie)).json.paginacion.total, 1);
  assert.equal((await pedir('/inventario?busqueda=F24%25_no_existe', cookie)).json.paginacion.total, 0);
  assert.equal((await pedir('/inventario?busqueda=Bebida%20de%20demostraci%C3%B3n%20F24', cookie)).json.insumos[0].id, i.id);
  const detalle = await pedir(`/inventario/${i.id}?limite=1`, cookie);
  assert.equal(detalle.status, 200); assert.equal(detalle.json.movimientos.length, 1); assert.equal(detalle.json.paginacion.total, 3);
  assert.equal(detalle.json.conciliacion.coincide, true); assert.equal(detalle.json.conciliacion.reservas_activas, '2.0000');
  const segundo = await pedir(`/inventario/${i.id}?limite=1&pagina=2`, cookie);
  assert.notEqual(detalle.json.movimientos[0].id, segundo.json.movimientos[0].id);
  const directo = await pedir(`/inventario/productos/${productos[0].id}`, cookie);
  assert.equal(directo.json.insumo.id, i.id); assert.equal(directo.json.insumo.disponible, '2.0000');
  assert.equal(Object.hasOwn(directo.json.producto, 'stock_actual'), false);
  assert.equal((await pedir(`/inventario/productos/${productos[1].id}`, cookie)).status, 409);
  assert.equal((await pedir('/inventario/2147483647', cookie)).status, 404);
  assert.equal((await pedir(`/inventario/${insumos[3].id}`, cookie)).json.movimientos.length, 0);
  console.log('OK: HTTP 401/403, filtros estrictos/literales, paginación, saldos, alertas, historial y producto directo.');
  // Solo este fixture: introducir diferencias válidas para el CHECK, sin tocar datos reales.
  await i.update({ stock_fisico: '5.0000', stock_reservado: '3.0000' });
  const antes = (await i.reload()).toJSON(), kardexAntes = await InventarioKardex.count({ where: { insumo_id: i.id } });
  const diferencia = await pedir(`/inventario/${i.id}`, cookie);
  assert.equal(diferencia.json.conciliacion.coincide, false);
  assert.equal(diferencia.json.conciliacion.diferencia_fisico, '1.0000');
  assert.equal(diferencia.json.conciliacion.diferencia_reservado, '1.0000');
  assert.equal(diferencia.json.conciliacion.diferencia_ultimo_saldo, '1.0000');
  await i.reload(); assert.equal(i.stock_fisico, antes.stock_fisico); assert.equal(i.stock_reservado, '3.0000');
  assert.equal(await InventarioKardex.count({ where: { insumo_id: i.id } }), kardexAntes);
  console.log('OK: conciliación detecta diferencias reales sin modificar saldos ni Kardex.');
  if (process.argv.includes('--vista')) {
    archivo = join(tmpdir(), `veneziana-f24-${marca}.json`);
    await writeFile(archivo, JSON.stringify({ usuarios, insumo: i.id, producto: productos[0].id, codigo }));
    console.log(`VISTA_TEMPORAL: ${archivo}`);
    console.log('Prueba visual preparada; enviar una línea para retirar sus fixtures.');
    await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve); });
    process.stdin.pause();
  }
} catch (error) { console.error('Fallo monitor:', error.message); process.exitCode = 1; }
finally {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await sequelize.transaction(async transaction => {
    if (tarea) await ReservaInsumo.destroy({ where: { tarea_id: tarea.id }, transaction });
    if (insumos.length) await InventarioKardex.destroy({ where: { insumo_id: insumos.map(i => i.id) }, transaction });
    if (tarea) await tarea.destroy({ transaction });
    if (item) await item.destroy({ transaction });
    if (pedido) await PedidoMaster.destroy({ where: { id: pedido.id, codigo_pedido: pedido.codigo_pedido }, transaction });
    for (const p of productos) await ProductoVenta.destroy({ where: { id: p.id, nombre: p.nombre }, transaction });
    for (const i of insumos) await InsumoAlmacen.destroy({ where: { id: i.id, codigo: i.codigo }, transaction });
    if (categoria) await CategoriaVenta.destroy({ where: { id: categoria.id, slug: categoria.slug }, transaction });
    if (unidad) await UnidadMedida.destroy({ where: { id: unidad.id, nombre: unidad.nombre }, transaction });
    for (const u of usuarios) { await AuthSesion.destroy({ where: { usuario_id: u.id }, transaction }); await Usuario.destroy({ where: { id: u.id, email: u.email }, transaction }); }
  });
  if (archivo) await unlink(archivo);
  await sequelize.close();
  console.log('Fixtures del monitor retirados.');
}
