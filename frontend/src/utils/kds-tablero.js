export const ETAPAS_KDS = ['espera', 'preparando', 'horno', 'listo_para_entrega']
export const NOMBRES_KDS = { espera: 'En espera', preparando: 'Preparando', horno: 'En horno', listo_para_entrega: 'Listos para entregar', entregado: 'Entregado', cancelado: 'Cancelado' }
export const etiquetaAccionKds = estado => ({ preparando: 'Iniciar preparación', horno: 'Pasar al horno', listo_para_entrega: 'Marcar listo', entregado: 'Confirmar entrega', cancelado: 'Cancelar tarea' })[estado]
const id = v => typeof v === 'string' && /^[1-9]\d{0,18}$/.test(v)
export function validarTareaKds(t) {
  if (!t || !id(t.id) || !id(t.pedido_item_id) || !id(t.pedido?.id) ||
    !Number.isSafeInteger(t.version) || t.version < 1 || !Number.isSafeInteger(t.cantidad) || t.cantidad < 1 ||
    !Number.isSafeInteger(t.componente_numero) || t.componente_numero < 1 ||
    !Object.hasOwn(NOMBRES_KDS, t.estado) || !['cocina', 'despacho'].includes(t.canal) ||
    typeof t.nombre !== 'string' || typeof t.indicaciones !== 'string' || typeof t.pedido.codigo !== 'string' ||
    !['salon', 'llevar', 'delivery'].includes(t.pedido.tipo_atencion) ||
    !Number.isFinite(Date.parse(t.enviado_en)) || !Array.isArray(t.modificadores) ||
    !t.modificadores.every(m => typeof m?.nombre === 'string' && typeof m.es_exclusion === 'boolean')) throw new Error('La información de cocina necesita revisión. Actualiza el tablero.')
  return t
}
export function accionesKds(t) {
  if (t.canal === 'despacho') return t.estado === 'espera' ? ['entregado', 'cancelado'] : []
  return ({ espera: ['preparando', 'cancelado'], preparando: ['horno', 'listo_para_entrega', 'cancelado'], horno: ['listo_para_entrega', 'cancelado'], listo_para_entrega: ['entregado', 'cancelado'] })[t.estado] ?? []
}
// El ID de componente es la identidad: no combinar líneas de un combo.
export function mezclarTareaKds(tareas, tarea) {
  validarTareaKds(tarea)
  const previa = tareas.find(t => t.id === tarea.id)
  if (previa && previa.version > tarea.version) return tareas
  const otras = tareas.filter(t => t.id !== tarea.id)
  return (ETAPAS_KDS.includes(tarea.estado) ? [...otras, tarea] : otras).sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1)
}
export function destinoKds(t) {
  return t.pedido.tipo_atencion === 'salon' ? `Mesa ${t.pedido.mesa?.codigo ?? 'sin registrar'}` : t.pedido.tipo_atencion === 'llevar' ? 'Para llevar' : 'Delivery'
}
