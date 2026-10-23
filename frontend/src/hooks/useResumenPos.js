import { useMemo } from 'react'
import useConsultaRemota from './useConsultaRemota.js'
import { consultarDatosBorradorPos } from '../services/pos.service.js'
import { estimarBorrador } from '../utils/carrito-estimacion.js'

// Una misma consulta alimenta el recibo y la barra móvil. Cambiar cantidades
// recalcula céntimos en memoria; cambiar productos o usuario renueva los datos.
export default function useResumenPos(lineas, usuarioId, preparado) {
  const claveIds = [...new Set(lineas.map(linea => linea.productoId))].sort((a, b) => a - b).join(',')
  const solicitud = useMemo(() => preparado ? {
    usuarioId, ids: claveIds ? claveIds.split(',').map(Number) : []
  } : null, [claveIds, usuarioId, preparado])
  const consulta = useConsultaRemota(consultarDatosBorradorPos, solicitud)
  const resumen = consulta.datos ? estimarBorrador(lineas, consulta.datos) : null
  return { ...consulta, resumen }
}
