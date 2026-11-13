import { solicitarApi } from './api.js'
const dinero = v => typeof v === 'string' && /^\d+\.\d{2}$/.test(v)
function validarVenta(v) {
  if (!v || !/^[1-9]\d*$/.test(v.id) || typeof v.codigo !== 'string' || !Number.isFinite(Date.parse(v.fecha)) || !v.cliente || typeof v.cliente.nombre !== 'string' || !dinero(v.total) || !Array.isArray(v.pagos)) throw new Error('El registro de venta recibido no es válido.')
  return v
}
export async function consultarHistorial({filtros,pagina=1},signal) {
  const r=await solicitarApi(`/reportes/ventas?${new URLSearchParams({...filtros,pagina:String(pagina),limite:'10'})}`,{signal})
  if(!Array.isArray(r.ventas)||!r.resumen||!r.paginacion||!Number.isSafeInteger(r.paginacion.total)||!dinero(r.resumen.total)||!dinero(r.resumen.devuelto)||! /^-?\d+\.\d{2}$/.test(r.resumen.neto))throw new Error('El historial recibido no es válido.')
  r.ventas.forEach(validarVenta)
  return r
}
export async function consultarVenta({id},signal) {
  if(!/^[1-9]\d{0,18}$/.test(id))throw new Error('Venta no válida.')
  const r=await solicitarApi(`/reportes/ventas/${id}`,{signal})
  validarVenta(r.venta)
  if(!Array.isArray(r.venta.lineas)||!Array.isArray(r.venta.devoluciones))throw new Error('El detalle recibido no es válido.')
  return r.venta
}
