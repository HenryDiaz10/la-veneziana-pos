import { sequelize } from '../config/database.js';
import { VentaComprobante, VentaDetalleSnapshot, VentaPagoSplit, VentaDevolucion, DevolucionDetalle,
  DevolucionPago, Cliente, CrmMovimientoPuntos } from '../models/index.js';
import { operacionComercial, auditoriaComercial, eventoComercial } from './operacion-comercial.js';
import { bloquearSesionPropia, autorizarCaja, construirResumenCaja } from './caja-cierre.service.js';
import { calcularLineasDevueltas, calcularPuntosDevueltos, repartirEnteros, revisionCaja } from './caja-calculo.js';
import { campos, idGrande, idEntero, texto, dinero, centimos, exigirPedido as exigir } from './pedidos-calculo.js';

async function cargarVenta(id, tx) {
  const venta = await VentaComprobante.findByPk(idGrande(id), { transaction: tx, lock: tx.LOCK.UPDATE });
  exigir(venta, 'VENTA_INEXISTENTE');
  // La nota de crédito fiscal requiere su integración propia. No fingirla.
  exigir(venta.tipo_documento_fiscal === 'ticket_interno' && venta.estado_emision === 'emitida', 'VENTA_NO_DEVOLVIBLE');
  const originales = await VentaDetalleSnapshot.findAll({ where: { venta_id: venta.id }, order: [['id', 'ASC']], transaction: tx });
  const pagos = await VentaPagoSplit.findAll({ where: { venta_id: venta.id }, order: [['id', 'ASC']], transaction: tx });
  const devoluciones = await VentaDevolucion.findAll({ where: { venta_id: venta.id }, order: [['id', 'ASC']], transaction: tx });
  const ids = devoluciones.map(d => d.id);
  const anteriores = ids.length ? await DevolucionDetalle.findAll({ where: { devolucion_id: ids }, order: [['id', 'ASC']], transaction: tx }) : [];
  const desembolsos = ids.length ? await DevolucionPago.findAll({ where: { devolucion_id: ids }, order: [['id', 'ASC']], transaction: tx }) : [];
  exigir(originales.length && originales.reduce((s, l) => s + centimos(l.total), 0n) === centimos(venta.total_final_venta) &&
    pagos.reduce((s, p) => s + centimos(p.monto_pagado), 0n) === centimos(venta.total_final_venta), 'VENTA_SIN_SNAPSHOT');
  exigir(devoluciones.reduce((s, d) => s + centimos(d.total), 0n) === anteriores.reduce((s, l) => s + centimos(l.importe), 0n) &&
    anteriores.reduce((s, l) => s + centimos(l.importe), 0n) === desembolsos.reduce((s, p) => s + centimos(p.monto), 0n), 'DEVOLUCION_INCONSISTENTE');
  return { venta, originales, pagos, devoluciones, anteriores, desembolsos };
}
function planDevolucion(c, seleccion) {
  const { venta, originales, pagos, anteriores, desembolsos } = c;
  const lineas = calcularLineasDevueltas(originales, anteriores, seleccion);
  const total = lineas.reduce((a, d) => a + centimos(d.importe), 0n);
  const previo = anteriores.reduce((a, d) => a + centimos(d.importe), 0n);
  exigir(total > 0n && previo + total <= centimos(venta.total_final_venta), 'DEVOLUCION_EXCEDE_VENTA');
  const puntos = calcularPuntosDevueltos(venta, originales, anteriores, lineas);
  const originalesMedio = new Map(), devueltosMedio = new Map();
  for (const p of pagos) originalesMedio.set(p.metodo_pago, (originalesMedio.get(p.metodo_pago) ?? 0n) + centimos(p.monto_pagado));
  for (const p of desembolsos) devueltosMedio.set(p.metodo_pago, (devueltosMedio.get(p.metodo_pago) ?? 0n) + centimos(p.monto));
  exigir(!originalesMedio.has('cortesia'), 'VENTA_NO_DEVOLVIBLE');
  const canje = centimos(puntos.importeCanje), dineroReal = total - canje;
  exigir(dineroReal >= 0n && canje + (devueltosMedio.get('puntos_vip') ?? 0n) <= (originalesMedio.get('puntos_vip') ?? 0n), 'DEVOLUCION_NO_DISTRIBUIBLE');
  const medios = [...originalesMedio.keys()].filter(m => m !== 'puntos_vip');
  const capacidades = medios.map(m => originalesMedio.get(m) - (devueltosMedio.get(m) ?? 0n));
  exigir(capacidades.every(n => n >= 0n) && dineroReal <= capacidades.reduce((a, n) => a + n, 0n), 'DEVOLUCION_NO_DISTRIBUIBLE');
  const reparto = repartirEnteros(dineroReal, capacidades);
  const pagosDevolucion = medios.map((m, i) => ({ metodo_pago: m, monto: dinero(reparto[i]) })).filter(p => centimos(p.monto) > 0n);
  if (canje) pagosDevolucion.push({ metodo_pago: 'puntos_vip', monto: dinero(canje) });
  // Revisar el mismo estado y selección al confirmar, sin persistir una oferta.
  const revision = revisionCaja({ venta_id: String(venta.id),
    anteriores: anteriores.map(d => ({ id: String(d.id), linea: String(d.venta_detalle_id), cantidad: d.cantidad, importe: d.importe })),
    desembolsos: desembolsos.map(p => ({ id: String(p.id), metodo: p.metodo_pago, monto: p.monto })), lineas, pagos: pagosDevolucion, puntos });
  return { venta_id: String(venta.id), total: dinero(total), lineas, pagos: pagosDevolucion, puntos, revision };
}
export function previsualizarDevolucion(id, datos, contexto = {}) {
  campos(datos, ['lineas']);
  return sequelize.transaction(contexto.transaction ? { transaction: contexto.transaction } : {}, async tx =>
    ({ propuesta: planDevolucion(await cargarVenta(id, tx), datos.lineas) }));
}
export function consultarDevoluciones(id, contexto = {}) {
  return sequelize.transaction(contexto.transaction ? { transaction: contexto.transaction } : {}, async tx => {
    const c = await cargarVenta(id, tx);
    return { venta: { id: String(c.venta.id), codigo: c.venta.serie_correlativo, total: c.venta.total_final_venta },
      lineas: c.originales.map(l => ({ id: String(l.id), nombre: l.descripcion_snapshot, cantidad: l.cantidad,
        total: l.total, cantidad_devuelta: c.anteriores.filter(d => String(d.venta_detalle_id) === String(l.id)).reduce((a, d) => a + d.cantidad, 0) })),
      devoluciones: c.devoluciones.map(d => ({ id: String(d.id), motivo: d.motivo, total: d.total, fecha: d.creado_en,
        pagos: c.desembolsos.filter(p => String(p.devolucion_id) === String(d.id)).map(p => ({ sesion_id: p.sesion_id, metodo_pago: p.metodo_pago, monto: p.monto })) })) };
  });
}
export function registrarDevolucion(id, datos, contexto) {
  id = idGrande(id);
  campos(datos, ['sesion_id', 'lineas', 'motivo', 'autorizacion_id', 'autorizacion_saldo_id', 'referencias', 'revision']);
  exigir(idEntero(datos.sesion_id) && typeof datos.revision === 'string' && /^[a-f0-9]{64}$/.test(datos.revision));
  const motivo = texto(datos.motivo, 500);
  exigir(motivo.length > 0);
  const referencias = datos.referencias ?? [];
  exigir(Array.isArray(referencias) && referencias.length <= 5);
  const ref = new Map();
  for (const r of referencias) {
    campos(r, ['metodo_pago', 'referencia', 'verificado']);
    exigir(['yape', 'plin', 'tarjeta_debito', 'tarjeta_credito', 'transferencia'].includes(r.metodo_pago) && !ref.has(r.metodo_pago));
    const t = texto(r.referencia, 100);
    exigir(t.length >= 3 && r.verificado === true, 'PAGO_SIN_VERIFICAR'); ref.set(r.metodo_pago, t);
  }
  return operacionComercial({ ...contexto, seguridad: true, tipo: 'venta.devolver', cuerpo: { id, ...datos } }, async (tx, uid) => {
    const sesion = await bloquearSesionPropia(datos.sesion_id, contexto.usuarioId, tx);
    const aprobacion = await autorizarCaja(datos.autorizacion_id, contexto.usuarioId, 'ventas/devolver', 'ventas_comprobantes', id, tx);
    // Resolver también los actores de la excepción antes de bloquear el cliente.
    const saldoAprobado = datos.autorizacion_saldo_id === undefined ? null : await autorizarCaja(datos.autorizacion_saldo_id,
      contexto.usuarioId, 'ventas/devolver_sin_saldo', 'ventas_comprobantes', id, tx);
    const c = await cargarVenta(id, tx), p = planDevolucion(c, datos.lineas);
    exigir(p.revision === datos.revision, 'DEVOLUCION_DESACTUALIZADA');
    const digitales = p.pagos.filter(p => !['efectivo', 'puntos_vip'].includes(p.metodo_pago));
    exigir(digitales.every(p => ref.has(p.metodo_pago)) && ref.size === digitales.length, 'PAGO_SIN_VERIFICAR');
    const efectivo = p.pagos.find(p => p.metodo_pago === 'efectivo');
    if (efectivo) {
      const r = await construirResumenCaja(sesion, tx);
      exigir(!r.totales.teorico_efectivo.startsWith('-') && centimos(r.totales.teorico_efectivo) >= centimos(efectivo.monto), 'EFECTIVO_INSUFICIENTE');
    }
    const clienteId = c.venta.snapshot_fiscal_json?.cliente?.id;
    const cliente = clienteId && await Cliente.findByPk(clienteId, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir((!p.puntos.revertidos && !p.puntos.restaurados) || cliente, 'CLIENTE_NO_DISPONIBLE');
    if (cliente) {
      const saldo = BigInt(cliente.puntos_vip_actuales ?? 0) - BigInt(p.puntos.revertidos) + BigInt(p.puntos.restaurados);
      if (saldo < 0n) exigir(saldoAprobado, 'AUTORIZACION_NO_VALIDA');
      else exigir(datos.autorizacion_saldo_id === undefined);
      const historico = BigInt(cliente.puntos_vip_historicos ?? 0) - BigInt(p.puntos.revertidos);
      exigir(saldo >= -2147483648n && saldo <= 2147483647n && historico >= 0n, 'PUNTOS_FUERA_RANGO');
      // Los contramovimientos conservan venta y UID de devolución; el saldo
      // negativo excepcional es deuda explícita autorizada, nunca puntos regalados.
      for (const [tipo, cantidad, sufijo] of [['ganancia_compra', -p.puntos.revertidos, 'ganancia'], ['canje_premio', p.puntos.restaurados, 'canje']]) {
        if (cantidad) await CrmMovimientoPuntos.create({ cliente_id: cliente.id, venta_id: id, tipo_movimiento: tipo, puntos: cantidad,
          operacion_uid: `${uid}:${sufijo}`, descripcion: `Compensación devolución ${uid}; ${sufijo}.` }, { transaction: tx });
      }
      await cliente.update({ puntos_vip_actuales: Number(saldo), puntos_vip_historicos: Number(historico) }, { transaction: tx });
    } else exigir(datos.autorizacion_saldo_id === undefined);
    const d = await VentaDevolucion.create({ venta_id: id, usuario_id: contexto.usuarioId, autorizador_id: aprobacion.aprobador_id,
      motivo, total: p.total, operacion_uid: uid }, { transaction: tx });
    for (const l of p.lineas) await DevolucionDetalle.create({ devolucion_id: d.id, venta_detalle_id: l.venta_detalle_id,
      cantidad: l.cantidad, importe: l.importe, restituye_stock: false }, { transaction: tx });
    for (const pago of p.pagos) await DevolucionPago.create({ devolucion_id: d.id, sesion_id: sesion.id, ...pago,
      referencia: ref.get(pago.metodo_pago) ?? null }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'ventas_devoluciones', d.id, { venta_id: id, sesion_id: sesion.id,
      total: p.total, autorizacion_id: String(aprobacion.id), autorizacion_saldo_id: datos.autorizacion_saldo_id ?? null, puntos: p.puntos }, tx);
    await eventoComercial('venta.devuelta', 'ventas_devoluciones', d.id, 1, { venta_id: id, sesion_id: sesion.id }, tx);
    // No modificar venta/pedido, reservas, tareas de cocina ni Kardex.
    return { devolucion: { id: String(d.id), venta_id: id, sesion_id: sesion.id, total: p.total,
      lineas: p.lineas.map(({ venta_detalle_id, cantidad, importe }) => ({ venta_detalle_id, cantidad, importe, restituye_stock: false })),
      pagos: p.pagos, puntos: p.puntos } };
  });
}
