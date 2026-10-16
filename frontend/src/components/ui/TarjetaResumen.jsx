import Icono from './Icono.jsx'

// Valores de consultas reales; nunca estadísticas ficticias del negocio.
function TarjetaResumen({ titulo, valor, detalle, icono, tono = 'dorado', pendiente = false }) {
  return <div className="vz-stat" data-tono={tono} aria-busy={pendiente}>
    <div className="vz-stat-icon"><Icono nombre={icono}/></div>
    <div className="min-w-0">
      <p className="vz-stat-label">{titulo}</p>
      <p className="vz-stat-value tabular-nums">{pendiente ? '—' : valor}</p>
      <p className="vz-stat-detail">{detalle}</p>
    </div>
  </div>
}
export default TarjetaResumen
