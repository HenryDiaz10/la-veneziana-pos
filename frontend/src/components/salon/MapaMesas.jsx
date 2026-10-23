import { useEffect, useRef, useState } from 'react'
import Icono from '../ui/Icono.jsx'
import { distribuirMesas, etiquetaEstado } from '../../utils/salon-mapa.js'

export function TarjetaMesa({ mesa, onSeleccionar, estilo, compacta = false }) {
  const estado = mesa.estado_actual ?? 'sin_estado'
  return <button type="button" style={estilo} className={`vz-table-seat is-${estado} ${compacta ? 'is-compact' : ''}`}
    aria-label={`Mesa ${mesa.codigo_mesa}, ${etiquetaEstado(mesa.estado_actual)}, ${mesa.capacidad_sillas > 0 ? `${mesa.capacidad_sillas} sillas` : 'capacidad sin registrar'}`}
    onClick={() => onSeleccionar(mesa.id)}>
    <span className="vz-table-shape"><Icono nombre="mesas"/><strong>{mesa.codigo_mesa}</strong></span>
    <span className="vz-table-status"><span aria-hidden="true"/>{etiquetaEstado(mesa.estado_actual)}</span>
    {!compacta && <span className="vz-table-meta">{mesa.capacidad_sillas > 0 ? `${mesa.capacidad_sillas} sillas` : 'Capacidad sin registrar'} · {mesa.mesero_asignado_id ? `Empleado #${mesa.mesero_asignado_id}` : 'Sin asignar'}</span>}
  </button>
}

export default function MapaMesas({ mesasZona, mesasVisibles, vista, onSeleccionar }) {
  const superficie = useRef(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    const nodo = superficie.current
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width))
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])
  // Usar toda la zona para calcular el croquis: filtrar no mueve las otras mesas.
  const distribucion = distribuirMesas(mesasZona, ancho)
  const mapa = vista === 'mapa' && distribucion.modo === 'mapa'
  return <div ref={superficie}>
    {vista === 'mapa' && !mapa && mesasZona.length > 0 && <p className="mb-4 text-sm text-app-secundario">Vista en cuadrícula: el espacio disponible o las posiciones registradas no permiten un croquis sin superposiciones.</p>}
    {!mesasVisibles.length ? <p role="status" className="vz-salon-empty">No hay mesas que coincidan con los filtros.</p> :
      <div className={mapa ? 'vz-floor-map' : 'vz-table-grid'} style={mapa ? { height: distribucion.alto } : undefined} aria-label={mapa ? 'Croquis de mesas' : 'Mesas en cuadrícula'}>
        {mesasVisibles.map(m => {
          const posicion = mapa && distribucion.posiciones.find(p => p.id === m.id)
          return <TarjetaMesa key={m.id} mesa={m} compacta={mapa} onSeleccionar={onSeleccionar}
            estilo={posicion ? { position: 'absolute', left: posicion.x, top: posicion.y, transform: 'translate(-50%, -50%)' } : undefined}/>
        })}
      </div>}
  </div>
}
