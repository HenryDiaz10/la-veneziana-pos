import { solicitarApi } from './api.js'
import { API_URL } from '../config/env.js'
import { validarTareaKds } from '../utils/kds-tablero.js'

export function urlSocketKds() {
  const url = new URL(`${API_URL}/kds/ws`, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}
export async function snapshotKds(signal) {
  const tareas = [], ids = new Set()
  let desde, hasta
  do {
    const query = new URLSearchParams({ limite: '200', ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) })
    const r = await solicitarApi(`/kds/tareas?${query}`, { signal })
    if (!Array.isArray(r?.tareas) || !r.paginacion || !Number.isFinite(Date.parse(r.servidor_en))) throw new Error('Respuesta KDS no válida.')
    for (const t of r.tareas) { validarTareaKds(t); if (ids.has(t.id)) throw new Error('Paginación KDS inconsistente.'); ids.add(t.id); tareas.push(t) }
    const siguiente = r.paginacion.siguiente
    if (siguiente !== null && (typeof siguiente !== 'string' || !/^[1-9]\d{0,18}$/.test(siguiente) || (desde && BigInt(siguiente) <= BigInt(desde)))) throw new Error('Cursor KDS no válido.')
    hasta = r.paginacion.hasta
    desde = siguiente
  } while (desde)
  return tareas
}
export async function enviarTransicionKds(intento) {
  const r = await solicitarApi(`/kds/tareas/${intento.id}/transiciones`, { metodo: 'POST', datos: intento.datos, claveIdempotencia: intento.clave })
  validarTareaKds(r?.tarea)
  return r.tarea
}
