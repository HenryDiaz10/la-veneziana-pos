import { solicitarApi } from './api.js'
import { validarSalon } from '../utils/salon-mapa.js'

// Cancelable al navegar o cambiar de identidad; nunca modifica mesas.
export async function consultarSalon(_solicitud, signal) {
  return validarSalon(await solicitarApi('/salon', { signal }))
}
