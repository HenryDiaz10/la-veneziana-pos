// MySQL local: solo fixtures temporales. No cambia FINANZAS ni ventas reales.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { abrirCaja } from '../src/services/caja.service.js';
import { consultarResumenCaja, registrarMovimientoCaja, cerrarCaja } from '../src/services/caja-cierre.service.js';
import { registrarDevolucion, previsualizarDevolucion } from '../src/services/devoluciones.service.js';
import { crearAutorizacion } from '../src/services/autorizaciones.service.js';
import { crearPedido } from '../src/services/pedidos.service.js';
import { registrarMovimiento } from '../src/services/inventario.service.js';
import { recuperarOperacion } from '../src/services/operacion-comercial.js';

assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], cajas = [], sesiones = [], clientes = [];
let servidor, categoria, unidad, insumo, producto;
const ctx = (i = 0) => ({ usuarioId: usuarios[i].id, clave: randomUUID() });
const rechaza = (fn, codigo) => assert.rejects(fn, e => e.codigo === codigo, `Esperado ${codigo}`);
async function aprobar(accion, entidad, entidadId, actor = 0, aprobador = 0) {
  const r = await crearAutorizacion({ aprobadorId: usuarios[aprobador].id, datos: { actorId: usuarios[actor].id, accion, entidad, entidadId: String(entidadId), motivo: 'Aprobación temporal F31' } });
  assert.equal(r.estado, 'creada', JSON.stringify(r)); return r.autorizacion.id;
}
// La venta histórica es un fixture de snapshot: no se altera la política fiscal.
async function ventaFixture({ sesion = sesiones[0], actor = 0, cantidad = 10, cliente = null, canje = 0, yape = '40.00', efectivo = '60.00' } = {}) {
  const pedido = (await crearPedido({ tipo_atencion: 'llevar', lineas: [{ productoId: producto.id, cantidad }] }, ctx(actor))).pedido;
  const total = (cantidad * 10).toFixed(2), ganados = cliente ? cantidad * 10 - canje / 10 : 0;
  const f = { modo: 'por_sol', puntos_ganados: ganados, puntos_canjeados: canje, valor_punto_pen: canje ? '0.10' : null };
  return sequelize.transaction(async tx => {
    const v = await m.VentaComprobante.create({ pedido_id: pedido.id, sesion_caja_id: sesion.id, cajero_id: usuarios[actor].id,
      serie_correlativo: `F31-${randomUUID().slice(0, 12)}`, subtotal_gravado: total, igv_total: '0.00', total_final_venta: total,
      operacion_uid: randomUUID(), snapshot_fiscal_json: { documento: 'ticket_interno', cliente: cliente ? { id: cliente.id } : null, fidelizacion: f } }, { transaction: tx });
    const l = await m.VentaDetalleSnapshot.create({ venta_id: v.id, pedido_item_id: pedido.lineas[0].id, descripcion_snapshot: 'Fixture F31', cantidad,
      precio_unitario: '10.00', base_imponible: total, impuesto: '0.00', total, snapshot_json: { puntos_recompensa: 0 } }, { transaction: tx });
    if (yape !== '0.00') await m.VentaPagoSplit.create({ venta_id: v.id, metodo_pago: 'yape', monto_pagado: yape, referencia_operacion: 'FIXTURE' }, { transaction: tx });
    if (efectivo !== '0.00') await m.VentaPagoSplit.create({ venta_id: v.id, metodo_pago: 'efectivo', monto_pagado: efectivo, monto_entregado: efectivo, vuelto: '0.00' }, { transaction: tx });
    if (canje) await m.VentaPagoSplit.create({ venta_id: v.id, metodo_pago: 'puntos_vip', monto_pagado: (canje / 10).toFixed(2) }, { transaction: tx });
    if (cliente) {
      await cliente.reload({ transaction: tx });
      await cliente.update({ puntos_vip_actuales: cliente.puntos_vip_actuales + ganados - canje, puntos_vip_historicos: cliente.puntos_vip_historicos + ganados }, { transaction: tx });
      for (const [tipo, p, sufijo] of [['ganancia_compra', ganados, 'ganancia'], ['canje_premio', -canje, 'canje']]) if (p) await m.CrmMovimientoPuntos.create({ cliente_id: cliente.id, venta_id: v.id, tipo_movimiento: tipo, puntos: p, operacion_uid: `${v.operacion_uid}:${sufijo}` }, { transaction: tx });
    }
    await m.PedidoMaster.update({ estado_cuenta: 'pagada', version: 2 }, { where: { id: pedido.id }, transaction: tx });
    return { venta: v, linea: l };
  });
}
async function comando(v, cantidad, actor = 0, sesion = sesiones[0]) {
  const lineas = [{ venta_detalle_id: String(v.linea.id), cantidad }];
  const { propuesta: p } = await previsualizarDevolucion(v.venta.id, { lineas });
  return { sesion_id: sesion.id, lineas, revision: p.revision, motivo: 'Producto servido por error',
    autorizacion_id: await aprobar('ventas/devolver', 'ventas_comprobantes', v.venta.id, actor),
    referencias: p.pagos.filter(p => !['efectivo', 'puntos_vip'].includes(p.metodo_pago)).map(p => ({ metodo_pago: p.metodo_pago, referencia: `F31-${randomUUID()}`, verificado: true })) };
}
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const rolNombre of ['administrador', 'administrador', 'cajero', 'cocinero']) {
    const rol = await m.Rol.findOne({ where: { nombre: rolNombre } }); assert.ok(rol);
    usuarios.push(await m.Usuario.create({ nombre_completo: 'Prueba temporal F31', email: `f31-${usuarios.length}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  for (let i = 0; i < 3; i++) {
    cajas.push(await m.CajaFisica.create({ nombre_terminal: `F31 ${marca.slice(0, 8)} ${i}`, estado: 'activa' }));
    sesiones.push((await abrirCaja({ caja_fisica_id: cajas[i].id, apertura_monto_base: '100.00' }, ctx(i))).sesion);
  }
  servidor = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const pedir = async (ruta, method = 'GET', body, actor = 0, csrf = true, key = randomUUID()) => {
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
    if (cookies[actor]) headers.Cookie = cookies[actor];
    if (csrf) { headers.Origin = env.origenFrontend; headers['X-CSRF-Protection'] = '1'; }
    const r = await fetch(base + ruta, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json(), headers: r.headers };
  };
  const cookies = [];
  for (const u of usuarios) { const r = await pedir('/auth/login', 'POST', { email: u.email, password }); assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]); }
  assert.equal((await pedir(`/caja/sesiones/${sesiones[0].id}/resumen`, 'GET', undefined, 3)).status, 403);
  assert.equal((await pedir(`/caja/sesiones/${sesiones[1].id}/resumen`)).status, 409);
  assert.equal((await pedir('/ventas/1/devoluciones', 'GET', undefined, 2)).status, 403);
  const ruta = `/caja/sesiones/${sesiones[2].id}`;
  assert.equal((await pedir(ruta + '/movimientos', 'POST', { tipo: 'ingreso', monto: '20', concepto: 'Cambio' }, 2, false)).status, 403);
  const keyMovimiento = randomUUID(), ingreso = { tipo: 'ingreso', monto: '20', concepto: 'Cambio' };
  assert.equal((await pedir(ruta + '/movimientos', 'POST', ingreso, 2, true, keyMovimiento)).status, 201);
  assert.equal((await pedir(ruta + '/movimientos', 'POST', ingreso, 2, true, keyMovimiento)).status, 200);
  assert.equal((await pedir(ruta + '/movimientos', 'POST', { ...ingreso, monto: '21' }, 2, true, keyMovimiento)).status, 409);
  const autorizacion = (await pedir('/autorizaciones', 'POST', { actorId: usuarios[2].id, accion: 'caja/egreso', entidad: 'sesiones_caja_z', entidadId: sesiones[2].id, motivo: 'Gasto de prueba F31' })).json.autorizacion;
  assert.ok(autorizacion);
  assert.equal((await pedir(ruta + '/movimientos', 'POST', { tipo: 'egreso', monto: '15', concepto: 'Gasto', autorizacion_id: autorizacion.id }, 2)).status, 201);
  const sinFondo = await aprobar('caja/egreso', 'sesiones_caja_z', sesiones[2].id, 2);
  assert.equal((await pedir(ruta + '/movimientos', 'POST', { tipo: 'egreso', monto: '999', concepto: 'Exceso', autorizacion_id: sinFondo }, 2)).json.codigo, 'EFECTIVO_INSUFICIENTE');
  assert.equal((await m.AutorizacionSensible.findByPk(sinFondo)).consumida_en, null);
  await m.AutorizacionSensible.update({ expira_en: new Date(Date.now() - 1000) }, { where: { id: sinFondo } });
  assert.equal((await pedir(ruta + '/movimientos', 'POST', { tipo: 'egreso', monto: '1', concepto: 'Vencida', autorizacion_id: sinFondo }, 2)).json.codigo, 'AUTORIZACION_NO_VALIDA');
  const previo = await pedir(ruta + '/resumen', 'GET', undefined, 2);
  assert.equal(previo.json.resumen.totales.teorico_efectivo, '105.00');
  await pedir(ruta + '/movimientos', 'POST', { tipo: 'ingreso', monto: '1', concepto: 'Nuevo cambio' }, 2);
  assert.equal((await pedir(ruta + '/cierre', 'POST', { cierre_real_efectivo: '105', revision: previo.json.revision }, 2)).json.codigo, 'CAJA_DESACTUALIZADA');
  const actual = await pedir(ruta + '/resumen', 'GET', undefined, 2), keyCierre = randomUUID();
  const conteo = { cierre_real_efectivo: '105', revision: actual.json.revision, observaciones: 'Falta S/1 en conteo de prueba' };
  const hookCorte = `corte-${marca}`, operacionCorte = ctx(2);
  m.EventoOutbox.addHook('beforeCreate', hookCorte, evento => { if (evento.tipo === 'caja.cerrada') throw new Error('fallo corte controlado'); });
  try { await assert.rejects(() => cerrarCaja(sesiones[2].id, conteo, operacionCorte), /fallo corte controlado/); }
  finally { m.EventoOutbox.removeHook('beforeCreate', hookCorte); }
  const sinCorte = await m.SesionCajaZ.findByPk(sesiones[2].id);
  assert.equal(sinCorte.estado_sesion, 'abierta'); assert.equal(sinCorte.snapshot_memento_json, null);
  assert.equal(await m.IdempotenciaOperacion.count({ where: { usuario_id: usuarios[2].id, clave: operacionCorte.clave } }), 0);
  // Un fallo al crear el original también revierte cierre y evento durable.
  const hookImpresion = `impresion-${marca}`, operacionImpresion = ctx(2);
  m.TrabajoImpresion.addHook('beforeCreate', hookImpresion, () => { throw new Error('fallo impresion cierre controlado'); });
  try { await assert.rejects(() => cerrarCaja(sesiones[2].id, conteo, operacionImpresion), /fallo impresion cierre controlado/); }
  finally { m.TrabajoImpresion.removeHook('beforeCreate', hookImpresion); }
  const sinImpresion = await m.SesionCajaZ.findByPk(sesiones[2].id);
  assert.equal(sinImpresion.estado_sesion, 'abierta'); assert.equal(sinImpresion.snapshot_memento_json, null);
  assert.equal(await m.IdempotenciaOperacion.count({ where: { usuario_id: usuarios[2].id, clave: operacionImpresion.clave } }), 0);
  assert.equal(await m.TrabajoImpresion.count({ where: { sesion_id: sesiones[2].id } }), 0);
  const cierreHttp = await pedir(ruta + '/cierre', 'POST', conteo, 2, true, keyCierre);
  assert.equal(cierreHttp.status, 200, JSON.stringify(cierreHttp.json)); assert.equal(cierreHttp.json.cierre.descuadre, '-1.00');
  const jobUid = cierreHttp.json.cierre.impresion.job_uid;
  assert.equal((await pedir(`/caja/impresion/${jobUid}`, 'GET', undefined, 2)).status, 200);
  assert.equal((await pedir(`/caja/impresion/${jobUid}`, 'GET', undefined, 0)).status, 404);
  assert.equal((await pedir(`/pedidos/impresion/${jobUid}`, 'GET', undefined, 2)).status, 404);
  const copiaKey = randomUUID();
  const otroDocumento = await m.TrabajoImpresion.create({ job_uid: randomUUID(), sesion_id: sesiones[2].id, tipo: 'copia', destino: 'caja', solicitado_por: usuarios[2].id, contenido_json: { documento: 'ticket_interno' } });
  assert.equal((await pedir(`/caja/impresion/${otroDocumento.job_uid}`, 'GET', undefined, 2)).status, 404);
  const copia = await pedir(ruta + '/copias', 'POST', {}, 2, true, copiaKey);
  assert.equal(copia.status, 201); assert.equal(copia.json.copia.impresion.numero_copia, 1);
  assert.ok((await pedir('/caja/impresion/pendientes', 'GET', undefined, 2)).json.trabajos.every(j => j.contenido.documento === 'cierre_caja'));
  const repetida = await pedir(ruta + '/copias', 'POST', {}, 2, true, copiaKey);
  assert.equal(repetida.json.copia.impresion.job_uid, copia.json.copia.impresion.job_uid);
  assert.equal((await pedir(ruta + '/copias', 'POST', {}, 2)).json.copia.impresion.numero_copia, 2);
  assert.equal(await m.TrabajoImpresion.count({ where: { sesion_id: sesiones[2].id, tipo: 'cierre' } }), 1);
  assert.deepEqual((await m.TrabajoImpresion.findOne({ where: { job_uid: copia.json.copia.impresion.job_uid } })).contenido_json.snapshot, cierreHttp.json.cierre.snapshot);
  assert.equal(typeof cierreHttp.json.cierre.snapshot, 'object');
  assert.equal((await pedir(ruta + '/cierre', 'POST', conteo, 2, true, keyCierre)).json.repetida, true);
  assert.equal((await pedir(ruta + '/movimientos', 'POST', ingreso, 2)).status, 409);
  assert.equal((await pedir(ruta + '/cierre', 'POST', conteo, 2)).status, 409);
  assert.equal((await pedir(`/caja/operaciones/caja.cerrar/${keyCierre}`, 'GET', undefined, 2)).json.cierre.descuadre, '-1.00');
  // Stock y snapshots son exclusivamente fixtures; no se modifica la carta.
  categoria = await m.CategoriaVenta.create({ nombre: `F31 ${marca}`, slug: `f31-${marca}`, activa: true, es_para_kds: false });
  unidad = await m.UnidadMedida.create({ nombre: `F31 ${marca}`, abreviatura: 'un' });
  insumo = await m.InsumoAlmacen.create({ nombre: `F31 ${marca}`, codigo: `F31-${marca}`, unidad_medida_id: unidad.id, activo: true, perecible: false });
  await registrarMovimiento({ insumo_id: insumo.id, tipo_transaccion: 'INGRESO_AJUSTE', cantidad: '500', costo_unitario: '1', operacion_uid: `mov:${randomUUID()}`, usuario_id: usuarios[0].id });
  producto = await m.ProductoVenta.create({ nombre: `F31 ${marca}`, categoria_id: categoria.id, precio_venta_base: '10.00', tipo_producto: 'producto_directo', controla_stock: true, insumo_directo_id: insumo.id, estado: 'activo' });
  for (let i = 0; i < 2; i++) clientes.push(await m.Cliente.create({ nombres: `Temporal F31 ${i}`, puntos_vip_actuales: 100, puntos_vip_historicos: 100, estado: 'activo' }));
  const v = await ventaFixture({ cliente: clientes[0] });
  const estadoVenta = (await v.venta.reload()).toJSON(), stockAntes = (await insumo.reload()).toJSON();
  assert.equal((await consultarResumenCaja(sesiones[0].id, ctx())).resumen.totales.teorico_efectivo, '160.00');
  const cuerpo = await comando(v, 3), op = ctx();
  const devHttp = await pedir(`/ventas/${v.venta.id}/devoluciones`, 'POST', cuerpo, 0, true, op.clave);
  assert.equal(devHttp.status, 201, JSON.stringify(devHttp.json));
  const dev = devHttp.json;
  assert.equal(dev.devolucion.total, '30.00');
  assert.equal(dev.devolucion.pagos.find(p => p.metodo_pago === 'efectivo').monto, '18.00');
  assert.equal(dev.devolucion.puntos.revertidos, 30);
  assert.equal((await registrarDevolucion(v.venta.id, cuerpo, op)).devolucion.id, dev.devolucion.id);
  assert.equal((await recuperarOperacion(usuarios[0].id, 'venta.devolver', op.clave)).devolucion.id, dev.devolucion.id);
  await rechaza(() => previsualizarDevolucion(v.venta.id, { lineas: [{ venta_detalle_id: String(v.linea.id), cantidad: 8 }] }), 'DEVOLUCION_EXCEDE_VENTA');
  const resto = await comando(v, 7);
  await producto.update({ precio_venta_base: '999.00' });
  assert.equal((await previsualizarDevolucion(v.venta.id, { lineas: resto.lineas })).propuesta.total, '70.00');
  await producto.update({ precio_venta_base: '10.00' });
  const desactualizada = { ...cuerpo, autorizacion_id: await aprobar('ventas/devolver', 'ventas_comprobantes', v.venta.id) };
  await rechaza(() => registrarDevolucion(v.venta.id, desactualizada, ctx()), 'DEVOLUCION_DESACTUALIZADA');
  assert.equal((await m.AutorizacionSensible.findByPk(desactualizada.autorizacion_id)).consumida_en, null);
  await rechaza(() => registrarDevolucion(v.venta.id, { ...resto, autorizacion_id: cuerpo.autorizacion_id }, ctx()), 'AUTORIZACION_NO_VALIDA');
  await rechaza(() => registrarDevolucion(v.venta.id, { ...resto, referencias: [] }, ctx()), 'PAGO_SIN_VERIFICAR');
  assert.equal((await m.AutorizacionSensible.findByPk(resto.autorizacion_id)).consumida_en, null);
  // Fallo después de escribir puntos/cabecera/detalles: rollback también consume autorización.
  const hook = `f31-${marca}`;
  m.DevolucionPago.addHook('beforeCreate', hook, () => { throw new Error('fallo desembolso controlado'); });
  try { await assert.rejects(() => registrarDevolucion(v.venta.id, resto, ctx()), /fallo desembolso controlado/); }
  finally { m.DevolucionPago.removeHook('beforeCreate', hook); }
  assert.equal(await m.VentaDevolucion.count({ where: { venta_id: v.venta.id } }), 1);
  assert.equal((await clientes[0].reload()).puntos_vip_actuales, 170);
  assert.equal((await m.AutorizacionSensible.findByPk(resto.autorizacion_id)).consumida_en, null);
  // El cliente gastó los puntos restantes. Sin segunda autorización no generar deuda.
  await m.CrmMovimientoPuntos.create({ cliente_id: clientes[0].id, tipo_movimiento: 'canje_premio', puntos: -170, operacion_uid: randomUUID(), descripcion: 'Fixture saldo gastado' });
  await clientes[0].update({ puntos_vip_actuales: 0 });
  await rechaza(() => registrarDevolucion(v.venta.id, resto, ctx()), 'AUTORIZACION_NO_VALIDA');
  resto.autorizacion_saldo_id = await aprobar('ventas/devolver_sin_saldo', 'ventas_comprobantes', v.venta.id);
  await registrarDevolucion(v.venta.id, resto, ctx());
  assert.equal((await clientes[0].reload()).puntos_vip_actuales, -70);
  assert.equal(clientes[0].puntos_vip_historicos, 100);
  assert.deepEqual((await v.venta.reload()).toJSON(), estadoVenta);
  assert.equal((await insumo.reload()).stock_fisico, stockAntes.stock_fisico); assert.equal(insumo.stock_reservado, stockAntes.stock_reservado);
  const canje = await ventaFixture({ cantidad: 2, cliente: clientes[1], canje: 20, yape: '0.00', efectivo: '18.00' });
  const parcial = await registrarDevolucion(canje.venta.id, await comando(canje, 1), ctx());
  assert.equal(parcial.devolucion.pagos.find(p => p.metodo_pago === 'efectivo').monto, '9.00');
  assert.equal(parcial.devolucion.pagos.find(p => p.metodo_pago === 'puntos_vip').monto, '1.00');
  assert.equal(parcial.devolucion.puntos.restaurados, 10);
  await registrarDevolucion(canje.venta.id, await comando(canje, 1), ctx());
  assert.equal((await clientes[1].reload()).puntos_vip_actuales, 100); assert.equal(clientes[1].puntos_vip_historicos, 100);
  // Cerrar conserva el memento; devolución posterior sale de una sesión nueva.
  const antigua = await ventaFixture({ cantidad: 1, yape: '0.00', efectivo: '10.00' });
  const r = await consultarResumenCaja(sesiones[0].id, ctx());
  const cierre = await cerrarCaja(sesiones[0].id, { cierre_real_efectivo: r.resumen.totales.teorico_efectivo, revision: r.revision }, ctx());
  const congelado = structuredClone(cierre.cierre.snapshot);
  const nueva = (await abrirCaja({ caja_fisica_id: cajas[0].id, apertura_monto_base: '50.00' }, ctx())).sesion;
  sesiones.push(nueva);
  const a = await comando(antigua, 1, 0, nueva), b = await comando(antigua, 1, 1, sesiones[1]);
  const carrera = await Promise.allSettled([registrarDevolucion(antigua.venta.id, a, ctx()), registrarDevolucion(antigua.venta.id, b, ctx(1))]);
  assert.equal(carrera.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await m.DevolucionDetalle.count({ where: { venta_detalle_id: antigua.linea.id } }), 1);
  assert.deepEqual((await m.SesionCajaZ.findByPk(sesiones[0].id)).snapshot_memento_json, congelado);
  // Cierre contra ingreso concurrente: entra antes del corte o queda rechazado.
  const corte = await consultarResumenCaja(nueva.id, ctx());
  const carreras = await Promise.allSettled([cerrarCaja(nueva.id, { cierre_real_efectivo: '50.00', revision: corte.revision }, ctx()),
    registrarMovimientoCaja(nueva.id, { tipo: 'ingreso', monto: '1.00', concepto: 'Carrera con corte' }, ctx())]);
  assert.equal(carreras.filter(r => r.status === 'fulfilled').length, 1);
  const estado = await m.SesionCajaZ.findByPk(nueva.id);
  if (estado.estado_sesion === 'cerrada') assert.equal(estado.snapshot_memento_json.movimientos.length, 0);
  else assert.equal(carreras[0].reason.codigo, 'CAJA_DESACTUALIZADA');
  const carreraVenta = await ventaFixture({ sesion: sesiones[1], actor: 1, cantidad: 1, yape: '0.00', efectivo: '10.00' });
  const reembolso = await comando(carreraVenta, 1, 1, sesiones[1]);
  const antesCorte = await consultarResumenCaja(sesiones[1].id, ctx(1));
  const corteVsDevolucion = await Promise.allSettled([
    cerrarCaja(sesiones[1].id, { cierre_real_efectivo: antesCorte.resumen.totales.teorico_efectivo, revision: antesCorte.revision }, ctx(1)),
    registrarDevolucion(carreraVenta.venta.id, reembolso, ctx(1))
  ]);
  assert.equal(corteVsDevolucion.filter(r => r.status === 'fulfilled').length, 1);
  const sesionFinal = await m.SesionCajaZ.findByPk(sesiones[1].id);
  const devuelve = await m.VentaDevolucion.count({ where: { venta_id: carreraVenta.venta.id } });
  assert.equal(devuelve, sesionFinal.estado_sesion === 'cerrada' ? 0 : 1);
  console.log('OK fase 31: HTTP/CSRF/permisos, movimientos autorizados, revision, cierre inmutable, reintentos, parciales, saldo excepcional, canje, rollback, sesiones posteriores y carreras reales sin doble devolución.');
} finally {
  if (servidor) await new Promise(r => servidor.close(r));
  const uids = usuarios.map(u => u.id), sids = sesiones.map(s => s.id);
  if (uids.length) {
    const trabajos = await m.TrabajoImpresion.findAll({ where: { solicitado_por: uids }, attributes: ['id'] });
    if (trabajos.length) await m.EventoOutbox.destroy({ where: { entidad: 'trabajos_impresion', entidad_id: trabajos.map(j => j.id) } });
    await m.TrabajoImpresion.destroy({ where: { solicitado_por: uids } });
  }
  const ventas = uids.length ? await m.VentaComprobante.findAll({ where: { cajero_id: uids }, attributes: ['id'] }) : [], vids = ventas.map(v => v.id);
  const devoluciones = vids.length ? await m.VentaDevolucion.findAll({ where: { venta_id: vids }, attributes: ['id'] }) : [], dids = devoluciones.map(d => d.id);
  if (dids.length) { await m.DevolucionPago.destroy({ where: { devolucion_id: dids } }); await m.DevolucionDetalle.destroy({ where: { devolucion_id: dids } }); await m.VentaDevolucion.destroy({ where: { id: dids } }); }
  if (clientes.length) await m.CrmMovimientoPuntos.destroy({ where: { cliente_id: clientes.map(c => c.id) } });
  if (vids.length) { await m.VentaPagoSplit.destroy({ where: { venta_id: vids } }); await m.VentaDetalleSnapshot.destroy({ where: { venta_id: vids } }); await m.VentaComprobante.destroy({ where: { id: vids } }); }
  const pedidos = uids.length ? await m.PedidoMaster.findAll({ where: { usuario_creador_id: uids }, attributes: ['id'] }) : [], pids = pedidos.map(p => p.id);
  if (pids.length) {
    const items = await m.PedidoItemKds.findAll({ where: { pedido_id: pids }, attributes: ['id'] }), iids = items.map(i => i.id);
    const tareas = await m.KdsTarea.findAll({ where: { pedido_item_id: iids }, attributes: ['id'] });
    if (tareas.length) { await m.ReservaInsumo.destroy({ where: { tarea_id: tareas.map(t => t.id) } }); await m.KdsHistorial.destroy({ where: { tarea_id: tareas.map(t => t.id) } }); }
    if (iids.length) { await m.KdsTarea.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemModificador.destroy({ where: { pedido_item_id: iids } }); await m.PedidoItemKds.destroy({ where: { id: iids } }); }
    await m.PedidoMaster.destroy({ where: { id: pids } });
  }
  if (uids.length) {
    // Los UIDs solo pertenecen a las fixtures; borrar eventos por sus entidades.
    if (pids.length) await m.EventoOutbox.destroy({ where: { entidad: 'pedidos_master', entidad_id: pids } });
    if (dids.length) await m.EventoOutbox.destroy({ where: { entidad: 'ventas_devoluciones', entidad_id: dids } });
    const movs = sids.length ? await m.MovimientoCajaChica.findAll({ where: { sesion_id: sids }, attributes: ['id'] }) : [];
    if (movs.length) await m.EventoOutbox.destroy({ where: { entidad: 'movimientos_caja_chica', entidad_id: movs.map(m => m.id) } });
    if (sids.length) { await m.EventoOutbox.destroy({ where: { entidad: 'sesiones_caja_z', entidad_id: sids } }); await m.MovimientoCajaChica.destroy({ where: { sesion_id: sids } }); }
    await m.AutorizacionSensible.destroy({ where: { actor_id: uids } }); await m.AuditLog.destroy({ where: { usuario_id: uids } });
    await m.IdempotenciaOperacion.destroy({ where: { usuario_id: uids } }); await m.AuthSesion.destroy({ where: { usuario_id: uids } });
    await m.SesionCajaZ.destroy({ where: { cajero_id: uids } });
  }
  if (producto) await producto.destroy();
  if (insumo) { await m.InventarioKardex.destroy({ where: { insumo_id: insumo.id } }); await insumo.destroy(); }
  if (unidad) await unidad.destroy(); if (categoria) await categoria.destroy();
  for (const c of clientes) await c.destroy(); for (const c of cajas) await c.destroy();
  if (uids.length) await m.Usuario.destroy({ where: { id: uids } });
  await sequelize.close();
}
