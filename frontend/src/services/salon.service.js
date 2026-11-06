import { solicitarApi } from './api.js'
import { validarSalon } from '../utils/salon-mapa.js'

// Cancelable al navegar o cambiar de identidad; nunca modifica mesas.
export async function consultarSalon(_solicitud, signal) {
  return validarSalon(await solicitarApi('/salon', { signal }))
}

export function guardarConfiguracionSalon({tipo,registro,datos,clave}) {
  const recurso=tipo==='mesa'?'mesas':'zonas'
  const eliminar=tipo==='eliminar-zona'
  return solicitarApi(`/salon/${recurso}${registro?`/${registro.id}`:''}`,{metodo:eliminar?'DELETE':registro?'PATCH':'POST',datos,claveIdempotencia:clave})
}
