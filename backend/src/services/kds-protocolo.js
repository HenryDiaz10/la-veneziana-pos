import { campos, exigirPedido as exigir, idGrande, idEntero } from './pedidos-calculo.js';

export const TIPOS_EVENTO_KDS = Object.freeze(['pedido.cocina', 'pedido.despacho']);
export const ESTADOS_ACTIVOS_KDS = Object.freeze(['espera', 'preparando', 'horno', 'listo_para_entrega']);
export function consultaKds(query) {
  campos(query, ['canal', 'desde', 'hasta', 'limite']);
  const canal = query.canal ?? 'todos', limite = query.limite === undefined ? 100 : Number(query.limite);
  exigir(['todos', 'cocina', 'despacho'].includes(canal) && (query.limite === undefined || (typeof query.limite === 'string' && /^\d{1,3}$/.test(query.limite))) && Number.isInteger(limite) && limite >= 1 && limite <= 200);
  const desde = query.desde === undefined ? null : idGrande(query.desde), hasta = query.hasta === undefined ? null : idGrande(query.hasta);
  exigir(!desde || !hasta || BigInt(desde) <= BigInt(hasta));
  return { canal, limite, desde, hasta };
}
// Solo notificaciones mínimas: nunca reenviar JSON arbitrario del outbox.
export function notificacionKds(evento) {
  exigir(TIPOS_EVENTO_KDS.includes(evento.tipo) && typeof evento.event_uid === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(evento.event_uid), 'EVENTO_KDS_INVALIDO');
  const p = evento.payload_json;
  exigir(p && typeof p === 'object' && Array.isArray(p.tareas) && p.tareas.length > 0 && p.tareas.length <= 100, 'EVENTO_KDS_INVALIDO');
  const tareas = p.tareas.map(idGrande);
  exigir(new Set(tareas).size === tareas.length && Number.isSafeInteger(evento.version) && evento.version > 0, 'EVENTO_KDS_INVALIDO');
  return { protocolo: 1, tipo: evento.tipo, event_uid: evento.event_uid, pedido_id: idGrande(p.pedido_id), version: evento.version,
    canal: evento.tipo === 'pedido.cocina' ? 'cocina' : 'despacho', tareas, servidor_en: new Date().toISOString() };
}
export function demoraReintentoKds(intento) {
  exigir(Number.isInteger(intento) && intento > 0);
  return Math.min(60000, 1000 * 2 ** Math.min(intento - 1, 6));
}
export function presentarTareaKds(tarea, item, pedido, mesa) {
  const s = tarea.snapshot_json;
  exigir(s && ['cocina', 'despacho'].includes(s.canal) && typeof s.nombre_producto === 'string' && item && pedido, 'KDS_INCONSISTENTE');
  const modificadores = s.modificadores ?? [], indicaciones = s.indicaciones ?? item.notas_preparacion ?? '';
  exigir(Array.isArray(modificadores) && modificadores.every(o => o && idEntero(o.id) && typeof o.nombre === 'string' &&
    (o.es_exclusion === undefined || typeof o.es_exclusion === 'boolean')) && typeof indicaciones === 'string' &&
    [...ESTADOS_ACTIVOS_KDS, 'entregado', 'cancelado'].includes(tarea.estado) && Number.isSafeInteger(tarea.version) && tarea.version > 0 &&
    Number.isSafeInteger(tarea.cantidad) && tarea.cantidad > 0, 'KDS_INCONSISTENTE');
  return { id: String(tarea.id), pedido_item_id: String(item.id), componente_numero: tarea.componente_numero, cantidad: tarea.cantidad,
    estado: tarea.estado, version: tarea.version, canal: s.canal, nombre: s.nombre_producto, variante: s.nombre_variante ?? null,
    indicaciones,
    modificadores: modificadores.map(o => ({ id: o.id, nombre: o.nombre, grupo_nombre: typeof o.grupo_nombre === 'string' ? o.grupo_nombre : null, es_exclusion: o.es_exclusion === true })),
    enviado_en: tarea.enviado_en, iniciado_en: tarea.iniciado_en, horno_en: tarea.horno_en, listo_en: tarea.listo_en, entregado_en: tarea.entregado_en,
    pedido: { id: String(pedido.id), codigo: pedido.codigo_pedido, tipo_atencion: pedido.tipo_atencion, estado_cuenta: pedido.estado_cuenta,
      mesa: mesa ? { id: mesa.id, codigo: mesa.codigo_mesa, zona_id: mesa.zona_id } : null } };
}
