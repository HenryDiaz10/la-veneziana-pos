import { randomUUID } from 'node:crypto';
import { TrabajoImpresion } from '../models/index.js';
import { eventoComercial, operacionComercial } from './operacion-comercial.js';
import { campos, exigirPedido as exigir } from './pedidos-calculo.js';

// El contenido queda congelado dentro de la misma transacción del cobro.
// No incluye referencias bancarias, credenciales ni información fiscal ficticia.
export async function encolarTicket({ venta, pedido, items, pagos, usuarioId }, tx) {
  const job = await TrabajoImpresion.create({ job_uid: randomUUID(), venta_id: venta.id,
    pedido_id: pedido.id, sesion_id: venta.sesion_caja_id, tipo: 'ticket', destino: 'caja',
    solicitado_por: usuarioId, contenido_json: { version: 1, documento: 'ticket_interno',
      titulo: 'LA VENEZIANA', codigo: venta.serie_correlativo, pedido: pedido.codigo_pedido,
      atencion: pedido.tipo_atencion, fecha: new Date().toISOString(),
      lineas: items.map(l => ({ nombre: l.snapshot_item_json.nombre, variante: l.snapshot_item_json.variante,
        cantidad: l.cantidad, total: l.subtotal_item, indicaciones: l.notas_preparacion,
        modificadores: l.snapshot_item_json.modificadores.map(m => m.nombre) })),
      subtotal: venta.subtotal_gravado, impuesto: venta.igv_total, total: venta.total_final_venta,
      pagos: pagos.map(p => ({ metodo: p.metodo_pago, importe: p.monto_pagado,
        ...(p.monto_entregado ? { recibido: p.monto_entregado, vuelto: p.vuelto } : {}) })),
      apertura_cajon: false } }, { transaction: tx });
  await eventoComercial('impresion.pendiente', 'trabajos_impresion', job.id, 1, { job_uid: job.job_uid }, tx);
  return { job_uid: job.job_uid, estado: job.estado, modo: 'pendiente' };
}
const publica = j => ({ job_uid: j.job_uid, estado: j.estado, intentos: j.intentos,
  destino: j.destino, contenido: j.contenido_json });
export async function pendientesImpresion(usuarioId) {
  const trabajos = await TrabajoImpresion.findAll({ where: { solicitado_por: usuarioId, estado: 'pendiente' },
    order: [['id', 'ASC']], limit: 20 });
  return { trabajos: trabajos.map(publica) };
}
export async function consultarImpresion(uid, usuarioId) {
  exigir(typeof uid === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(uid));
  const j = await TrabajoImpresion.findOne({ where: { job_uid: uid, solicitado_por: usuarioId } });
  exigir(j, 'OPERACION_INEXISTENTE');
  return { trabajo: publica(j) };
}
// La simulación valida transporte y formato. Nunca confirma papel impreso.
export function registrarSimulacion(uid, datos, contexto) {
  campos(datos, ['sha256']);
  exigir(typeof datos.sha256 === 'string' && /^[a-f0-9]{64}$/.test(datos.sha256));
  exigir(typeof uid === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(uid));
  return operacionComercial({ ...contexto, tipo: 'impresion.simular', cuerpo: { uid, ...datos } }, async tx => {
    const j = await TrabajoImpresion.findOne({ where: { job_uid: uid, solicitado_por: contexto.usuarioId }, transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(j, 'OPERACION_INEXISTENTE');
    if (j.estado !== 'enviado') {
      exigir(j.estado === 'pendiente');
      await j.update({ estado: 'enviado', intentos: j.intentos + 1 }, { transaction: tx });
      await eventoComercial('impresion.simulada', 'trabajos_impresion', j.id, 1, { job_uid: uid, sha256: datos.sha256 }, tx);
    }
    return { job_uid: uid, estado: 'enviado', modo: 'simulacion', impresion_fisica: false };
  });
}
