import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { crearPedido } from '../src/services/pedidos.service.js';
import { registrarMovimiento, consumirTarea } from '../src/services/inventario.service.js';
import { consultarGerencial } from '../src/services/reportes.service.js';
import { registrarCategoriaGasto, registrarGasto, listarGastos } from '../src/services/gastos.service.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], gastosApi = [], categoriasApi = [];
let tx, servidor, rolLector;
try {
  const password = randomBytes(20).toString('hex'), hash = await crearHashPassword(password);
  for (const nombre of ['administrador', 'cajero']) {
    const rol = await m.Rol.findOne({ where: { nombre } });
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Fixture reportes', email: `f39-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  rolLector = await m.Rol.create({ nombre: `f39-${marca.slice(0, 12)}`, descripcion: 'Fixture solo lectura' });
  const permisoLectura = await m.Permiso.findOne({ where: { modulo: 'reportes', accion: 'leer' } });
  await m.RolPermiso.create({ rol_id: rolLector.id, permiso_id: permisoLectura.id });
  usuarios.push(await m.Usuario.create({ nombre_completo: 'Fixture lector F39', email: `f39-lector-${marca}@example.invalid`, password_hash: hash, rol_id: rolLector.id, estado: 'activo' }));
  servidor = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const url = `http://127.0.0.1:${servidor.address().port}/api`, cookies = [];
  for (const u of usuarios) {
    const r = await fetch(url + '/auth/login', { method: 'POST', headers: { Origin: env.origenFrontend, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password }) });
    assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]);
  }
  const pedir = async (ruta, actor = 0, body, csrf = true, clave = randomUUID()) => {
    const r = await fetch(url + ruta, { method: body ? 'POST' : 'GET', headers: { ...(actor === null ? {} : { Cookie: cookies[actor] }),
      ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': clave, ...(csrf ? { Origin: env.origenFrontend, 'X-CSRF-Protection': '1' } : {}) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, json: await r.json(), headers: r.headers };
  };
  assert.equal((await pedir('/reportes/gerencial', null)).status, 401);
  assert.equal((await pedir('/reportes/gerencial', 1)).status, 403);
  assert.equal((await pedir('/reportes/gerencial')).status, 400);
  assert.equal((await pedir('/reportes/gerencial?desde=2026-02-30&hasta=2026-11-05')).status, 400);
  assert.equal((await pedir('/reportes/gastos', 1, { prueba: true })).status, 403);
  assert.equal((await pedir('/reportes/gastos', 0, { prueba: true }, false)).status, 403);
  const nuevaCategoria = await pedir('/reportes/gastos/categorias', 0, { nombre: `API F39 ${marca}`, es_deducible_impuestos: false });
  assert.equal(nuevaCategoria.status, 201); categoriasApi.push(nuevaCategoria.json.categoria.id);
  const entradaApi = { categoria_id: categoriasApi[0], descripcion: 'Fixture gasto API', monto_gasto: '0.01', fecha_gasto: '2001-01-01', clasificacion: 'operativo' };
  const claveApi = randomUUID();
  const dobles = await Promise.all([pedir('/reportes/gastos', 0, entradaApi, true, claveApi), pedir('/reportes/gastos', 0, entradaApi, true, claveApi)]);
  for (const r of dobles) if (r.json.gasto) gastosApi.push(r.json.gasto.id);
  assert.deepEqual(dobles.map(r => r.status).sort(), [200, 201]); assert.equal(new Set(gastosApi).size, 1);
  assert.equal((await pedir('/reportes/gastos', 0, { ...entradaApi, monto_gasto: '0.02' }, true, claveApi)).status, 409);
  const anteriorCursor = gastosApi[0] - 1;
  const listadoApi = await pedir(`/reportes/gastos?desde=2001-01-01&hasta=2001-01-01&limite=1${anteriorCursor ? `&despues=${anteriorCursor}` : ''}`);
  assert.equal(listadoApi.status, 200); assert.equal(listadoApi.json.gastos[0].id, gastosApi[0]);
  assert.equal((await pedir('/reportes/gerencial?desde=2001-01-01&hasta=2001-01-01', 2)).status, 200);
  assert.equal((await pedir('/reportes/gastos', 2, entradaApi)).status, 403);
  tx = await sequelize.transaction();
  const ctx = () => ({ usuarioId: usuarios[0].id, clave: randomUUID(), transaction: tx });
  const caja = await m.CajaFisica.create({ nombre_terminal: `F39 ${marca.slice(0, 8)}`, estado: 'activa' }, { transaction: tx });
  const sesion = await m.SesionCajaZ.create({ caja_fisica_id: caja.id, cajero_id: usuarios[0].id, apertura_monto_base: '100', estado_sesion: 'cerrada', cierre_fecha: new Date() }, { transaction: tx });
  const otraSesion = await m.SesionCajaZ.create({ caja_fisica_id: caja.id, cajero_id: usuarios[1].id, apertura_monto_base: '100', estado_sesion: 'cerrada', cierre_fecha: new Date() }, { transaction: tx });
  const unidad = await m.UnidadMedida.create({ nombre: `F39 ${marca}`, abreviatura: 'un' }, { transaction: tx });
  const insumo = await m.InsumoAlmacen.create({ nombre: `F39 ${marca}`, codigo: `F39-${marca}`, unidad_medida_id: unidad.id, activo: true, perecible: false }, { transaction: tx });
  await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: '30', costo_unitario: '1', operacion_uid: `mov:${randomUUID()}`, usuario_id: usuarios[0].id }, { transaction: tx });
  const categoria = await m.CategoriaVenta.create({ nombre: `F39 ${marca}`, slug: `f39-${marca}`, activa: true, es_para_kds: false }, { transaction: tx });
  const producto = await m.ProductoVenta.create({ nombre: 'Fixture F39', categoria_id: categoria.id, precio_venta_base: '10.00', tipo_producto: 'producto_directo', controla_stock: true, insumo_directo_id: insumo.id, estado: 'activo' }, { transaction: tx });
  const facturar = async (fecha, sesionId = sesion.id, estado = 'emitida', cantidad = 10) => {
    const pedido = (await crearPedido({ tipo_atencion: 'llevar', lineas: [{ productoId: producto.id, cantidad }] }, ctx())).pedido;
    const total = cantidad === 10 ? '100.00' : '10.00';
    const venta = await m.VentaComprobante.create({ pedido_id: pedido.id, sesion_caja_id: sesionId, cajero_id: usuarios[0].id, serie_correlativo: `F39-${randomUUID().slice(0, 12)}`,
      subtotal_gravado: cantidad === 10 ? '90.00' : '9.00', igv_total: cantidad === 10 ? '10.00' : '1.00', total_final_venta: total,
      estado_emision: estado, fecha_emision: new Date(fecha), snapshot_fiscal_json: { fixture: true }, operacion_uid: randomUUID() }, { transaction: tx });
    const tarea = await m.KdsTarea.findOne({ where: { pedido_item_id: pedido.lineas[0].id }, transaction: tx });
    return { venta, tarea };
  };
  const actual = await facturar('2026-11-05T05:00:00Z');
  for (const [metodo, monto] of [['efectivo', '40.00'], ['yape', '60.00']]) await m.VentaPagoSplit.create({ venta_id: actual.venta.id, metodo_pago: metodo, monto_pagado: monto, monto_entregado: metodo === 'efectivo' ? '50.00' : null, vuelto: metodo === 'efectivo' ? '10.00' : '0.00' }, { transaction: tx });
  const anterior = await facturar('2026-11-05T04:59:59Z', otraSesion.id, 'emitida', 1);
  await facturar('2026-11-05T04:59:59Z', sesion.id, 'emitida', 1);
  await facturar('2026-11-06T05:00:00Z', sesion.id, 'emitida', 1);
  await facturar('2026-11-05T12:00:00Z', sesion.id, 'anulada', 1);
  const q = { desde: '2026-11-05', hasta: '2026-11-05', sesion_id: String(sesion.id) };
  const reporte = () => consultarGerencial(q, tx);
  const parcial = await reporte(); assert.equal(parcial.ventas.cantidad, 1); assert.equal(parcial.ventas.total, '100.00'); assert.equal(parcial.estimacion.completa, false);
  assert.ok(parcial.estimacion.advertencias.includes('reservas_pendientes'));
  await consumirTarea(actual.tarea.id, { usuarioId: usuarios[0].id, transaction: tx });
  await m.InventarioKardex.update({ fecha_movimiento: new Date('2026-11-05T15:00:00Z') }, { where: { referencia_documento: `tarea:${actual.tarea.id}` }, transaction: tx });
  // Cambiar costo vivo no altera costo de la venta ya consumida.
  await insumo.update({ costo_promedio: '99.0000' }, { transaction: tx });
  const cat = (await registrarCategoriaGasto({ nombre: `Gasto F39 ${marca}`, es_deducible_impuestos: false }, ctx())).categoria;
  const montoPorClase = { operativo: '2.00', financiero: '3.00', extraordinario: '4.00', provision_impuesto: '5.00' };
  let movimientoVinculado;
  for (const [clasificacion, monto] of Object.entries(montoPorClase)) {
    const mov = await m.MovimientoCajaChica.create({ sesion_id: sesion.id, tipo: 'egreso', monto, concepto: `Fixture ${clasificacion}`, autorizado_por: usuarios[0].id, operacion_uid: randomUUID(), fecha_hora: new Date('2026-11-05T15:00:00Z') }, { transaction: tx });
    movimientoVinculado = mov;
    const entrada = { categoria_id: cat.id, descripcion: `Fixture ${clasificacion}`, clasificacion, monto_gasto: monto, fecha_gasto: '2026-11-05', movimiento_caja_id: mov.id };
    const c = ctx(); const a = await registrarGasto(entrada, c), b = await registrarGasto(entrada, c);
    assert.equal(a.gasto.id, b.gasto.id); assert.equal(b.repetida, true);
    await assert.rejects(registrarGasto(entrada, ctx()), { codigo: 'MOVIMIENTO_YA_VINCULADO' });
  }
  await m.MovimientoCajaChica.create({ sesion_id: sesion.id, tipo: 'egreso', monto: '50.00', concepto: 'Capital del préstamo, no gasto', autorizado_por: usuarios[0].id, operacion_uid: randomUUID(), fecha_hora: new Date('2026-11-05T15:00:00Z') }, { transaction: tx });
  const bueno = await reporte(); assert.equal(bueno.ventas.total, '100.00'); assert.equal(bueno.ventas.base_registrada, '90.00'); assert.equal(bueno.ventas.ticket_promedio, '100.00');
  assert.equal(bueno.medios.find(p => p.metodo === 'efectivo').cobrado, '40.00'); assert.equal(bueno.medios.find(p => p.metodo === 'yape').cobrado, '60.00');
  assert.equal(bueno.costos.cohorte_ventas, '10.0000'); assert.equal(bueno.costos.salidas_periodo[0].costo, '10.0000');
  assert.equal(bueno.gastos.total, '14.00'); assert.equal(bueno.movimientos.egresos, '64.00'); assert.equal(bueno.movimientos.egresos_sin_gasto, '50.00');
  assert.equal(bueno.estimacion.resultado_tras_gastos, '66.0000'); assert.equal(bueno.estimacion.completa, true);
  assert.equal(bueno.serie_ventas.length, 1); assert.equal(bueno.serie_ventas[0].fecha, '2026-11-05');
  // Devolver una venta antigua desde la sesión actual: aparece por desembolso.
  const d = await m.VentaDevolucion.create({ venta_id: anterior.venta.id, usuario_id: usuarios[0].id, autorizador_id: usuarios[0].id, motivo: 'Fixture devolución', total: '5.00', operacion_uid: randomUUID(), creado_en: new Date('2026-11-05T16:00:00Z') }, { transaction: tx });
  for (const [medio, monto] of [['efectivo', '2.00'], ['yape', '3.00']]) await m.DevolucionPago.create({ devolucion_id: d.id, sesion_id: sesion.id, metodo_pago: medio, monto }, { transaction: tx });
  const devuelto = await reporte(); assert.equal(devuelto.devoluciones_periodo, '5.00'); assert.equal(devuelto.neto_comercial_periodo_incluye_impuesto, '95.00'); assert.equal(devuelto.ventas.cantidad, 1);
  // Devolución sobre la cohorte: no inventar un desglose tributario inexistente.
  await m.VentaDevolucion.create({ venta_id: actual.venta.id, usuario_id: usuarios[0].id, autorizador_id: usuarios[0].id, motivo: 'Fixture parcial', total: '1.00', operacion_uid: randomUUID() }, { transaction: tx });
  assert.equal((await reporte()).estimacion.resultado_tras_gastos, null);
  const invalidos = { categoria_id: cat.id, descripcion: 'Monto no coincide', clasificacion: 'operativo', monto_gasto: '99.00', fecha_gasto: '2026-11-05', movimiento_caja_id: movimientoVinculado.id };
  await assert.rejects(registrarGasto(invalidos, ctx()), { codigo: 'MOVIMIENTO_GASTO_NO_VALIDO' });
  const categoriasPrevias = await m.GastoFinancieroOperativo.count({ transaction: tx });
  const hook = `rollback-${marca}`; m.AuditLog.addHook('beforeCreate', hook, () => { throw new Error('Fallo tardío controlado'); });
  try { await assert.rejects(registrarGasto({ ...invalidos, movimiento_caja_id: null }, ctx())); } finally { m.AuditLog.removeHook('beforeCreate', hook); }
  assert.equal(await m.GastoFinancieroOperativo.count({ transaction: tx }), categoriasPrevias);
  const todos = await consultarGerencial({ ...q, estado: 'todos' }, tx); assert.equal(todos.ventas.cantidad, 2); assert.equal(todos.estimacion.completa, false);
  const utc = await consultarGerencial({ ...q, zona_horaria: 'UTC' }, tx); assert.equal(utc.ventas.cantidad, 2);
  const ruta = `/reportes/gerencial?desde=2026-11-05&hasta=2026-11-05&sesion_id=${sesion.id}`;
  const respuesta = await pedir(ruta); assert.equal(respuesta.status, 200); assert.equal(respuesta.headers.get('cache-control'), 'no-store'); assert.equal(respuesta.json.ventas.cantidad, 0);
  // Los registros de esta prueba no son visibles fuera de la transacción.
  const lista = await listarGastos({ desde: '2026-11-05', hasta: '2026-11-05', sesion_id: String(sesion.id) }); assert.equal(lista.gastos.length, 0);
  await registrarGasto({ categoria_id: cat.id, descripcion: 'Gasto global no asignado', clasificacion: 'operativo', monto_gasto: '1.00', fecha_gasto: '2026-11-05' }, ctx());
  assert.ok((await reporte()).estimacion.advertencias.includes('gastos_globales_no_asignados_a_sesion'));
  console.log('OK F39: HTTP/sesión/permisos/CSRF, periodo Lima/UTC, ventas mixtas sin duplicar, costo histórico y pendiente, cuatro gastos vinculados sin doble egreso, principal separado, devoluciones de venta antigua, estados, idempotencia y rollback. Fixtures revertidas; FINANZAS intacta.');
} finally {
  if (tx && !tx.finished) await tx.rollback();
  if (servidor) await new Promise(r => servidor.close(r));
  const ids = usuarios.map(u => u.id);
  if (gastosApi.length) await m.GastoFinancieroOperativo.destroy({ where: { id: gastosApi } });
  if (categoriasApi.length) await m.CategoriaGastoFijo.destroy({ where: { id: categoriasApi } });
  if (ids.length) { await m.AuthSesion.destroy({ where: { usuario_id: ids } }); await m.AuditLog.destroy({ where: { usuario_id: ids } }); await m.IdempotenciaOperacion.destroy({ where: { usuario_id: ids } }); await m.Usuario.destroy({ where: { id: ids } }); }
  if (rolLector) { await m.RolPermiso.destroy({ where: { rol_id: rolLector.id } }); await rolLector.destroy(); }
  await sequelize.close();
}
