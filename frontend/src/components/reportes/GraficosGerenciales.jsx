import { useMemo, useRef } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { useTemaStore } from '../../stores/tema.store.js'
import { MEDIOS_REPORTE, monedaReporte, serieCompletaReporte, COLORES_REPORTE as colores } from '../../utils/reportes.js'
import BotonBase from '../ui/BotonBase.jsx'
import { imagenReporte } from '../../services/reportes.service.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)
// Fondo explícito también en PNG: legible en cualquiera de los dos temas.
const fondo = { id: 'fondoVeneziana', beforeDraw(chart, _args, options) { const { ctx, width, height } = chart; ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = options.color; ctx.fillRect(0, 0, width, height); ctx.restore() } }
export default function GraficosGerenciales({ reporte, bloqueado }) {
  const tema = useTemaStore(s => s.tema), dona = useRef(null), barras = useRef(null)
  const oscuro = tema === 'oscuro', tinta = oscuro ? '#f8fafc' : '#0f172a'
  const medios = reporte.medios.filter(m => m.cobrado !== '0.00')
  const serie = useMemo(() => serieCompletaReporte(reporte), [reporte])
  const opciones = { responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: 2,
    plugins: { legend: { display: false }, fondoVeneziana: { color: oscuro ? '#1b2028' : '#ffffff' }, title: { display: true, color: tinta, text: [`${reporte.filtros.desde} a ${reporte.filtros.hasta}`, `${reporte.filtros.estado} · ${reporte.filtros.zona_horaria} · PEN · sesión ${reporte.filtros.sesion_id ?? 'todas'}`], font: { size: 10 } } } }
  function png(ref, nombre) { if (!bloqueado && ref.current) { const a = document.createElement('a'); a.href = imagenReporte(ref.current.canvas, reporte, nombre, oscuro); a.download = `veneziana-${nombre}-${reporte.filtros.desde}-${reporte.filtros.hasta}.png`; a.click() } }
  return <div className="vz-report-graficos">
    <section className="vz-report-panel"><header><div><h2>Cobros por medio</h2><p>Importes aplicados a las ventas seleccionadas.</p></div><BotonBase disabled={bloqueado || !medios.length} onClick={() => png(dona, 'medios')}>Descargar PNG de medios</BotonBase></header>
      <div className="vz-report-canvas">{medios.length ? <Doughnut ref={dona} role="img" aria-label="Distribución de cobros por medio. Importes exactos en la tabla de medios de pago." plugins={[fondo]} data={{ labels: medios.map(m => MEDIOS_REPORTE[m.metodo]), datasets: [{ data: medios.map(m => Number(m.cobrado)), backgroundColor: medios.map((_, i) => colores[i % colores.length]), borderColor: oscuro ? '#1b2028' : '#ffffff', borderWidth: 3 }] }} options={{ ...opciones, cutout: '65%', plugins: { ...opciones.plugins, tooltip: { callbacks: { label: c => `${MEDIOS_REPORTE[medios[c.dataIndex].metodo]}: ${monedaReporte(medios[c.dataIndex].cobrado)}` } } } }}/>
        : <p className="vz-report-vacio">No hay cobros para dibujar con estos filtros.</p>}</div>
      <ul className="vz-report-leyenda">{medios.map((m, i) => <li key={m.metodo}><span aria-hidden="true" style={{ backgroundColor: colores[i % colores.length] }}/>{MEDIOS_REPORTE[m.metodo]} <strong>{monedaReporte(m.cobrado)}</strong></li>)}</ul>
      <p className="vz-report-nota">Las devoluciones y netos se muestran en la tabla; no se representan valores negativos en la dona.</p>
    </section>
    <section className="vz-report-panel"><header><div><h2>Ventas por día</h2><p>Total con impuesto, por fecha de emisión.</p></div><BotonBase disabled={bloqueado || !reporte.ventas.cantidad} onClick={() => png(barras, 'ventas')}>Descargar PNG de ventas</BotonBase></header>
      <div className="vz-report-canvas">{reporte.ventas.cantidad ? <Bar ref={barras} role="img" aria-label="Ventas diarias en soles. Detalle exacto disponible debajo del gráfico." plugins={[fondo]} data={{ labels: serie.map(d => d.fecha.slice(5)), datasets: [{ label: 'Ventas con impuesto', data: serie.map(d => Number(d.total)), backgroundColor: '#F59E0B', hoverBackgroundColor: '#D97706', borderRadius: 5 }] }} options={{ ...opciones, scales: { x: { ticks: { color: tinta, maxTicksLimit: 8 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: tinta }, title: { display: true, text: 'S/ (escala visual)', color: tinta } } }, plugins: { ...opciones.plugins, tooltip: { callbacks: { title: c => serie[c[0].dataIndex].fecha, label: c => monedaReporte(serie[c.dataIndex].total) } } } }}/>
        : <p className="vz-report-vacio">Todavía no hay ventas en el periodo seleccionado.</p>}</div>
      <details><summary>Ver detalle diario exacto ({serie.length} días)</summary><div className="vz-report-scroll"><table><caption className="sr-only">Detalle de ventas por día</caption><thead><tr><th>Fecha</th><th>Ventas</th><th>Total</th></tr></thead><tbody>{serie.map(d => <tr key={d.fecha}><th scope="row">{d.fecha}</th><td>{d.cantidad}</td><td>{monedaReporte(d.total)}</td></tr>)}</tbody></table></div></details>
    </section>
  </div>
}
