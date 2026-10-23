import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SesionCajaZ, CajaFisica, VentaComprobante, MovimientoCajaChica, AutorizacionSensible } from '../models/index.js';
import { consumirAutorizacion, AutorizacionNoValidaError } from './autorizaciones.service.js';
import { operacionComercial, auditoriaComercial, eventoComercial } from './operacion-comercial.js';
import { campos, idEntero, centimos, dinero, texto, ErrorPedido, exigirPedido as exigir } from './pedidos-calculo.js';
import { consolidarCaja, dineroConSigno, revisionCaja } from './caja-calculo.js';

export async function bloquearSesionPropia(id, usuarioId, tx, abierta = true) {
  exigir(idEntero(id));
  const s = await SesionCajaZ.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
  exigir(s && s.cajero_id === usuarioId && (!abierta || s.estado_sesion === 'abierta'), 'SESION_CAJA_NO_DISPONIBLE');
  if (abierta) {
    const caja = await CajaFisica.findByPk(s.caja_fisica_id, { transaction: tx, lock: tx.LOCK.SHARE });
    exigir(caja?.estado === 'activa', 'CAJA_NO_DISPONIBLE');
  }
  return s;
}
export async function autorizarCaja(id, usuarioId, accion, entidad, entidadId, tx) {
  try { await consumirAutorizacion({ autorizacionId: id, actorId: usuarioId, accion, entidad, entidadId, transaction: tx }); }
  catch (e) { if (e instanceof AutorizacionNoValidaError) throw new ErrorPedido('AUTORIZACION_NO_VALIDA'); throw e; }
  return AutorizacionSensible.findByPk(id, { transaction: tx });
}
const fecha = v => v ? new Date(v).toISOString() : null;
// El llamador tiene la fila de sesión bloqueada: cobro, movimientos, desembolsos
// y cierre comparten esta barrera. Se filtra por sesión, nunca por fecha del día.
export async function construirResumenCaja(s, tx) {
  const ventas = await VentaComprobante.findAll({ where: { sesion_caja_id: s.id }, order: [['id', 'ASC']], transaction: tx });
  const pagos = await sequelize.query(`SELECT CAST(p.id AS CHAR) AS id, CAST(p.venta_id AS CHAR) AS venta_id, p.metodo_pago, p.monto_pagado, p.monto_entregado, p.vuelto
    FROM ventas_pagos_split p INNER JOIN ventas_comprobantes v ON v.id=p.venta_id
    WHERE v.sesion_caja_id=:sesion ORDER BY p.id`, { replacements: { sesion: s.id }, type: QueryTypes.SELECT, transaction: tx });
  const movimientos = await MovimientoCajaChica.findAll({ where: { sesion_id: s.id }, order: [['id', 'ASC']], transaction: tx });
  const devoluciones = await sequelize.query(`SELECT CAST(p.id AS CHAR) AS id, CAST(p.devolucion_id AS CHAR) AS devolucion_id, CAST(d.venta_id AS CHAR) AS venta_id, p.metodo_pago, p.monto, d.creado_en
    FROM devoluciones_pagos p INNER JOIN ventas_devoluciones d ON d.id=p.devolucion_id
    WHERE p.sesion_id=:sesion ORDER BY p.id`, { replacements: { sesion: s.id }, type: QueryTypes.SELECT, transaction: tx });
  const totales = consolidarCaja({ apertura: s.apertura_monto_base, pagos, movimientos, devoluciones });
  const vendido = ventas.reduce((a, v) => a + centimos(v.total_final_venta), 0n);
  exigir(vendido === pagos.reduce((a, p) => a + centimos(p.monto_pagado), 0n), 'CAJA_INCONSISTENTE');
  return { version_algoritmo: 1, moneda: 'PEN', zona_horaria: 'America/Lima',
    formula: 'apertura + efectivo aplicado + ingresos - egresos - devoluciones en efectivo de esta sesion',
    sesion: { id: s.id, caja_fisica_id: s.caja_fisica_id, cajero_id: s.cajero_id, apertura_fecha: fecha(s.apertura_fecha), apertura_monto_base: s.apertura_monto_base },
    ventas: ventas.map(v => ({ id: String(v.id), pedido_id: String(v.pedido_id), codigo: v.serie_correlativo, total: v.total_final_venta, fecha: fecha(v.fecha_emision) })),
    pagos: pagos.map(p => ({ ...p, id: String(p.id), venta_id: String(p.venta_id) })),
    movimientos: movimientos.map(m => ({ id: m.id, tipo: m.tipo, monto: m.monto, concepto: m.concepto,
      comprobante_respaldo: m.comprobante_respaldo, autorizado_por: m.autorizado_por, fecha: fecha(m.fecha_hora) })),
    devoluciones: devoluciones.map(d => ({ ...d, id: String(d.id), devolucion_id: String(d.devolucion_id), venta_id: String(d.venta_id), creado_en: fecha(d.creado_en) })),
    totales: { ...totales, total_ventas: dinero(vendido) } };
}
export function consultarResumenCaja(id, contexto) {
  return sequelize.transaction(contexto.transaction ? { transaction: contexto.transaction } : {}, async tx => {
    const s = await bloquearSesionPropia(id, contexto.usuarioId, tx, false);
    const resumen = s.estado_sesion === 'abierta' ? await construirResumenCaja(s, tx) : s.snapshot_memento_json;
    exigir(resumen && typeof resumen === 'object' && !Array.isArray(resumen), 'CIERRE_SIN_SNAPSHOT');
    return { estado: s.estado_sesion, resumen, revision: revisionCaja(resumen) };
  });
}
export function registrarMovimientoCaja(id, datos, contexto) {
  campos(datos, ['tipo', 'monto', 'concepto', 'comprobante_respaldo', 'autorizacion_id']);
  exigir(['ingreso', 'egreso'].includes(datos.tipo));
  const monto = dinero(centimos(datos.monto)), concepto = texto(datos.concepto, 255), respaldo = texto(datos.comprobante_respaldo, 100);
  exigir(centimos(monto) > 0n && concepto.length > 0);
  exigir(datos.tipo === 'egreso' || datos.autorizacion_id === undefined);
  return operacionComercial({ ...contexto, seguridad: datos.tipo === 'egreso', tipo: 'caja.movimiento', cuerpo: { id, ...datos } }, async (tx, uid) => {
    const s = await bloquearSesionPropia(id, contexto.usuarioId, tx);
    let aprobacion = null;
    if (datos.tipo === 'egreso') {
      aprobacion = await autorizarCaja(datos.autorizacion_id, contexto.usuarioId, 'caja/egreso', 'sesiones_caja_z', id, tx);
      const r = await construirResumenCaja(s, tx);
      exigir(!r.totales.teorico_efectivo.startsWith('-') && centimos(r.totales.teorico_efectivo) >= centimos(monto), 'EFECTIVO_INSUFICIENTE');
    }
    const m = await MovimientoCajaChica.create({ sesion_id: id, tipo: datos.tipo, monto, concepto, comprobante_respaldo: respaldo || null,
      autorizado_por: aprobacion?.aprobador_id ?? null, operacion_uid: uid }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'movimientos_caja_chica', m.id, { sesion_id: id, tipo: m.tipo, monto, autorizacion_id: aprobacion ? String(aprobacion.id) : null }, tx);
    await eventoComercial('caja.movimiento', 'movimientos_caja_chica', m.id, 1, { sesion_id: id }, tx);
    return { movimiento: { id: m.id, sesion_id: id, tipo: m.tipo, monto, concepto } };
  });
}
export function cerrarCaja(id, datos, contexto) {
  campos(datos, ['cierre_real_efectivo', 'revision', 'observaciones']);
  const contado = dinero(centimos(datos.cierre_real_efectivo)), observaciones = texto(datos.observaciones, 500);
  exigir(typeof datos.revision === 'string' && /^[a-f0-9]{64}$/.test(datos.revision));
  return operacionComercial({ ...contexto, tipo: 'caja.cerrar', cuerpo: { id, ...datos } }, async tx => {
    const s = await bloquearSesionPropia(id, contexto.usuarioId, tx);
    const resumen = await construirResumenCaja(s, tx), revision = revisionCaja(resumen);
    exigir(revision === datos.revision, 'CAJA_DESACTUALIZADA', { revision });
    const teorico = resumen.totales.teorico_efectivo;
    const base = teorico.startsWith('-') ? -centimos(teorico.slice(1)) : centimos(teorico);
    const diferencia = dineroConSigno(centimos(contado) - base), corte = new Date();
    const snapshot = { ...resumen, revision_previa: revision, corte_utc: corte.toISOString(),
      cierre: { realizado_por: contexto.usuarioId, contado, descuadre: diferencia, observaciones } };
    // No existe endpoint de edición/reapertura: repetir misma clave recupera el
    // resultado; otra clave sobre una sesión cerrada se rechaza, sin sobrescribir.
    await s.update({ cierre_fecha: corte, cierre_teorico_efectivo: teorico, cierre_real_efectivo: contado,
      descuadre_monto: diferencia, snapshot_memento_json: snapshot, estado_sesion: 'cerrada' }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'sesiones_caja_z', id, { estado: 'cerrada', contado, teorico, diferencia, revision }, tx);
    await eventoComercial('caja.cerrada', 'sesiones_caja_z', id, 1, { sesion_id: id, corte_utc: corte.toISOString() }, tx);
    return { cierre: { sesion_id: id, estado: 'cerrada', teorico, contado, descuadre: diferencia, snapshot } };
  });
}
