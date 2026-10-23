import { VentaComprobante, VentaPagoSplit, VentaDetalleSnapshot, PedidoItemKds, SesionCajaZ,
  CajaFisica, Cliente, CrmMovimientoPuntos, ConfiguracionGlobal, MesaSalon } from '../models/index.js';
import { operacionComercial, auditoriaComercial, eventoComercial } from './operacion-comercial.js';
import { bloquearPedido, comprobarVersion } from './pedidos.service.js';
import { campos, idEntero, idGrande, exigirPedido as exigir, centimos, dinero, politicaFinanciera, desglosarImpuesto, validarPagos } from './pedidos-calculo.js';

export function cobrarPedido(id, datos, contexto) {
  id = idGrande(id);
  campos(datos, ['version', 'sesion_caja_id', 'pagos']);
  exigir(idEntero(datos.sesion_caja_id));
  return operacionComercial({ ...contexto, tipo: 'pedido.cobrar', cuerpo: { id, ...datos } }, async (tx, uid) => {
    // Cierre Z y cobro deben compartir este bloqueo; nunca calcular el teórico
    // leyendo pagos fuera de la transacción protegida por la sesión.
    const sesion = await SesionCajaZ.findByPk(datos.sesion_caja_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(sesion?.estado_sesion === 'abierta' && sesion.cajero_id === contexto.usuarioId, 'SESION_CAJA_NO_DISPONIBLE');
    const caja = await CajaFisica.findByPk(sesion.caja_fisica_id, { transaction: tx, lock: tx.LOCK.SHARE });
    exigir(caja?.estado === 'activa', 'CAJA_NO_DISPONIBLE');
    const pedido = await bloquearPedido(id, tx);
    comprobarVersion(pedido, datos.version);
    exigir(pedido.estado_cuenta === 'bloqueada_en_pago' && pedido.bloqueo_usuario_id === contexto.usuarioId &&
      pedido.bloqueo_hasta > new Date(), 'BLOQUEO_NO_DISPONIBLE');
    exigir(!await VentaComprobante.findOne({ where: { pedido_id: pedido.id }, transaction: tx }), 'PEDIDO_YA_COBRADO');
    const items = await PedidoItemKds.findAll({ where: { pedido_id: pedido.id, estado_item: 'activo' }, order: [['id', 'ASC']], transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(items.length > 0 && items.length <= 100, 'PEDIDO_NO_ABIERTO');
    const total = items.reduce((s, l) => s + centimos(l.subtotal_item), 0n);
    exigir(total > 0n && total === centimos(pedido.total_preliminar), 'TOTAL_INCONSISTENTE');
    const config = await ConfiguracionGlobal.findByPk('FINANZAS', { transaction: tx, lock: tx.LOCK.SHARE });
    const politica = politicaFinanciera(config?.valor_json);
    const pagos = validarPagos(datos.pagos, total, politica);
    exigir(!pagos.canje || (pedido.cliente_id && contexto.puedeCanjear === true), 'CANJE_NO_AUTORIZADO');
    const cliente = pedido.cliente_id && await Cliente.findByPk(pedido.cliente_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(!pedido.cliente_id || cliente?.estado === 'activo', 'CLIENTE_NO_DISPONIBLE');
    if (cliente) exigir(cliente.puntos_vip_actuales >= pagos.canje, 'PUNTOS_INSUFICIENTES');
    const lineas = items.map(l => ({ item: l, fiscal: desglosarImpuesto(centimos(l.subtotal_item), politica.tasa) }));
    const base = lineas.reduce((s, l) => s + centimos(l.fiscal.base), 0n);
    const impuesto = lineas.reduce((s, l) => s + centimos(l.fiscal.impuesto), 0n);
    // Acumular solo por un modo y por el importe no cubierto con puntos.
    const importeCanje = pagos.filas.filter(p => p.metodo_pago === 'puntos_vip').reduce((s, p) => s + centimos(p.monto_pagado), 0n);
    const elegible = total - importeCanje;
    const puntosProductos = items.reduce((s, l) => {
      const puntos = l.snapshot_item_json.puntos_recompensa;
      exigir(Number.isSafeInteger(puntos) && puntos >= 0, 'TOTAL_INCONSISTENTE');
      return s + BigInt(puntos) * BigInt(l.cantidad);
    }, 0n);
    const ganados = cliente ? politica.modo === 'por_sol' ? elegible * BigInt(politica.factor) / 100n : puntosProductos * elegible / total : 0n;
    exigir(ganados <= 2147483647n, 'PUNTOS_FUERA_RANGO');
    const fidelizacion = { modo: politica.modo, puntos_por_sol: politica.factor, importe_elegible: dinero(elegible),
      puntos_ganados: Number(ganados), puntos_canjeados: pagos.canje, valor_punto_pen: politica.valorPunto };
    const venta = await VentaComprobante.create({ pedido_id: pedido.id, sesion_caja_id: sesion.id, cajero_id: contexto.usuarioId,
      tipo_documento_fiscal: 'ticket_interno', serie_correlativo: `T-${uid.replaceAll('-', '').slice(0, 18)}`,
      subtotal_gravado: dinero(base), igv_total: dinero(impuesto), total_final_venta: dinero(total), operacion_uid: uid,
      snapshot_fiscal_json: { version: 1, documento: 'ticket_interno', emision_fiscal: false, precios_incluyen_impuesto: true,
        igv_porcentaje: politica.porcentaje, redondeo: 'mitad_arriba_por_linea', cliente: pedido.snapshot_cliente_json, fidelizacion } }, { transaction: tx });
    for (const l of lineas) await VentaDetalleSnapshot.create({ venta_id: venta.id, pedido_item_id: l.item.id,
      descripcion_snapshot: l.item.snapshot_item_json.nombre, cantidad: l.item.cantidad, precio_unitario: l.item.precio_unitario_grabado,
      base_imponible: l.fiscal.base, impuesto: l.fiscal.impuesto, total: l.fiscal.total,
      snapshot_json: { ...l.item.snapshot_item_json, igv_porcentaje: politica.porcentaje, indicaciones: l.item.notas_preparacion } }, { transaction: tx });
    for (const p of pagos.filas) await VentaPagoSplit.create({ venta_id: venta.id, ...p }, { transaction: tx });
    if (cliente) {
      const saldo = BigInt(cliente.puntos_vip_actuales ?? 0) - BigInt(pagos.canje) + ganados;
      const historico = BigInt(cliente.puntos_vip_historicos ?? 0) + ganados;
      exigir(saldo >= 0n && saldo <= 2147483647n && historico <= 2147483647n, 'PUNTOS_FUERA_RANGO');
      if (pagos.canje) await CrmMovimientoPuntos.create({ cliente_id: cliente.id, venta_id: venta.id, tipo_movimiento: 'canje_premio', puntos: -pagos.canje,
        operacion_uid: `${uid}:canje`, descripcion: 'Canje como medio de pago, sin descuento adicional.' }, { transaction: tx });
      if (ganados > 0n) await CrmMovimientoPuntos.create({ cliente_id: cliente.id, venta_id: venta.id, tipo_movimiento: 'ganancia_compra', puntos: Number(ganados),
        operacion_uid: `${uid}:ganancia`, descripcion: `Acumulación ${politica.modo}, excluyendo importe canjeado.` }, { transaction: tx });
      await cliente.update({ puntos_vip_actuales: Number(saldo), puntos_vip_historicos: Number(historico) }, { transaction: tx });
    }
    await pedido.update({ estado_cuenta: 'pagada', bloqueo_usuario_id: null, bloqueo_hasta: null, version: pedido.version + 1 }, { transaction: tx });
    if (pedido.mesa_id) {
      const mesa = await MesaSalon.findByPk(pedido.mesa_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (mesa?.estado_actual === 'ocupada') await mesa.update({ estado_actual: 'sucia_por_limpiar' }, { transaction: tx });
    }
    await auditoriaComercial(contexto.usuarioId, 'ventas_comprobantes', venta.id, { pedido_id: String(pedido.id), sesion_caja_id: sesion.id, total: dinero(total) }, tx);
    await eventoComercial('venta.confirmada', 'ventas_comprobantes', venta.id, 1, { venta_id: String(venta.id), pedido_id: String(pedido.id) }, tx);
    // No invocar consumo de inventario: ya está reservado y se consume al
    // iniciar preparación/despachar, con los servicios internos de inventario.
    return { venta: { id: String(venta.id), pedido_id: String(pedido.id), sesion_caja_id: sesion.id, tipo_documento: 'ticket_interno',
      serie_correlativo: venta.serie_correlativo, subtotal: venta.subtotal_gravado, impuesto: venta.igv_total,
      total: venta.total_final_venta, pagos: pagos.filas, fidelizacion }, pedido: { id: String(pedido.id), estado_cuenta: pedido.estado_cuenta, version: pedido.version } };
  });
}
