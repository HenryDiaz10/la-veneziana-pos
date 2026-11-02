import { formatoTiempo, tiempoTareaKds } from '../../utils/kds-tiempo.js'

export default function TiempoKds({ tarea, ahora, umbrales, sincronizado }) {
  const tiempo = tiempoTareaKds(tarea, ahora, umbrales)
  return <div className={`vz-kds-tiempos ${tiempo.excedido ? 'es-recordatorio' : ''}`}>
    {/* No aria-live por segundo: evitar interrumpir continuamente al lector. */}
    <div><span>{tarea.estado === 'horno' ? 'Tiempo en horno' : 'Tiempo en etapa'}</span><strong aria-label={`Tiempo en etapa: ${formatoTiempo(tiempo.etapa)}`}>{formatoTiempo(tiempo.etapa)}</strong></div>
    <div><span>Desde recibido</span><strong>{formatoTiempo(tiempo.total)}</strong></div>
    {tiempo.excedido && <p className="vz-kds-umbral"><span aria-hidden="true">◷</span> Revisar preparación · recordatorio de {umbrales[tarea.estado]} min</p>}
    {tiempo.etapa === null && <p className="vz-kds-umbral">Inicio de etapa sin confirmar o fecha no conciliada.</p>}
    {!sincronizado && <p className="vz-kds-umbral">Referencia sin actualización confirmada.</p>}
  </div>
}
