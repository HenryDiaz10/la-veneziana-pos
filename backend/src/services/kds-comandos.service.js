import { KdsTarea, KdsHistorial, PedidoItemKds } from '../models/index.js';
import { operacionComercial, eventoComercial, auditoriaComercial } from './operacion-comercial.js';
import { consumirTarea, liberarTarea } from './inventario.service.js';
import { consumirAutorizacion, AutorizacionNoValidaError } from './autorizaciones.service.js';
import { consultarTareaKds } from './kds.service.js';
import { comandoKds, transicionKds } from './kds-reglas.js';
import { idGrande, exigirPedido as exigir, ErrorPedido } from './pedidos-calculo.js';

export function cambiarTareaKds(id, datos, contexto) {
  id = idGrande(id);
  const comando = comandoKds(datos);
  // La barrera de seguridad precede al actor, igual que las aprobaciones.
  return operacionComercial({ ...contexto, seguridad: comando.estado === 'cancelado', tipo: 'kds.transicion', cuerpo: { id, ...comando } }, async (tx, uid) => {
    // La línea es barrera de sus componentes: calcular el resumen sin carreras.
    // No tomar el pedido después de la línea/tarea (el cobro lo toma primero).
    const referencia = await KdsTarea.findByPk(id, { transaction: tx, attributes: ['pedido_item_id'], raw: true });
    exigir(referencia, 'TAREA_KDS_INEXISTENTE');
    const item = await PedidoItemKds.findByPk(referencia.pedido_item_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    const tarea = await KdsTarea.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(tarea && ['cocina', 'despacho'].includes(tarea.snapshot_json?.canal), 'TAREA_KDS_INEXISTENTE');
    const plan = transicionKds(tarea, comando);
    if (plan.autorizar) {
      try {
        await consumirAutorizacion({ autorizacionId: comando.autorizacion_id, actorId: contexto.usuarioId,
          accion: 'kds/cancelar', entidad: 'kds_tareas', entidadId: id, transaction: tx });
      } catch (e) { if (e instanceof AutorizacionNoValidaError) throw new ErrorPedido('AUTORIZACION_NO_VALIDA'); throw e; }
    } else exigir(comando.autorizacion_id === undefined);
    if (plan.consumir) await consumirTarea(id, { usuarioId: contexto.usuarioId, transaction: tx });
    if (plan.liberar) await liberarTarea(id, { transaction: tx });
    const anterior = tarea.estado;
    await tarea.update({ estado: comando.estado, version: tarea.version + 1, ...(plan.fecha ? { [plan.fecha]: new Date() } : {}) }, { transaction: tx });
    await KdsHistorial.create({ tarea_id: id, usuario_id: contexto.usuarioId, estado_anterior: anterior,
      estado_nuevo: tarea.estado, version: tarea.version, operacion_uid: uid, motivo: comando.motivo || null }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'kds_tareas', id, { estado_anterior: anterior, estado: tarea.estado, version: tarea.version, motivo: comando.motivo }, tx);
    const componentes = await KdsTarea.findAll({ where: { pedido_item_id: item.id }, attributes: ['estado'], transaction: tx, raw: true });
    const etapas = ['espera', 'preparando', 'horno', 'listo_para_entrega', 'entregado'];
    const pendientes = componentes.filter(c => c.estado !== 'cancelado');
    const resumen = pendientes.length ? etapas[Math.min(...pendientes.map(c => etapas.indexOf(c.estado)))] : null;
    // Cancelar preparación no anula ni cambia el importe comercial de la línea.
    await item.update({ estado_kanban: resumen, version: item.version + 1,
      ...(resumen && etapas.indexOf(resumen) >= 3 && !item.fecha_marcado_listo ? { fecha_marcado_listo: new Date() } : {}) }, { transaction: tx });
    await eventoComercial('kds.actualizada', 'kds_tareas', id, tarea.version,
      { pedido_id: String(item.pedido_id), tareas: [id], canal: tarea.snapshot_json.canal }, tx);
    // Proyectar en la misma transacción; no abrir otra conexión antes del commit.
    return consultarTareaKds(id, tx);
  });
}
