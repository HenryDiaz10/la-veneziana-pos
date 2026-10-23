import { solicitarApi } from './api.js'
import { idSesionValido } from '../utils/arqueo-calculo.js'
export const consultarSesionCaja = (_, signal) => solicitarApi('/caja/sesion', { signal })
export async function consultarArqueo({ id }, signal) {
  if (!idSesionValido(String(id))) throw new Error('Indica una sesión de caja válida.')
  const datos = await solicitarApi(`/caja/sesiones/${id}/resumen`, { signal })
  const r = datos?.resumen
  if (!['abierta', 'cerrada', 'auditada'].includes(datos?.estado) || r?.sesion?.id !== Number(id) || !r.totales ||
    !['ventas', 'pagos', 'movimientos', 'devoluciones'].every(k => Array.isArray(r[k])) ||
    (datos.estado !== 'abierta' && (!r.cierre || typeof r.cierre.contado !== 'string' || typeof r.cierre.descuadre !== 'string'))) throw new Error('Respuesta incompleta del arqueo. Reintenta consultar el cierre.')
  return datos
}
