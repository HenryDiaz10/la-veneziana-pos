import { useMemo, useState } from 'react'
import { useAuthStore } from '../stores/auth.store.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarGerencial, descargarReporte } from '../services/reportes.service.js'
import { filtrosInicialesReporte, filtroReporte, monedaReporte, MEDIOS_REPORTE, CLASES_REPORTE, AVISOS_REPORTE, csvReporte } from '../utils/reportes.js'
import GraficosGerenciales from '../components/reportes/GraficosGerenciales.jsx'
import GastosReporte from '../components/reportes/GastosReporte.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import Icono from '../components/ui/Icono.jsx'
import '../styles/reportes.css'

export default function Reportes() {
  const uid = useAuthStore(s => s.usuario?.id)
  return <ContenidoReportes key={uid} uid={uid}/>
}
function ContenidoReportes({ uid }) {
  const [aplicados, setAplicados] = useState(filtrosInicialesReporte)
  const [edicion, setEdicion] = useState(() => ({ ...aplicados, sesion_id: '' })), [errorFiltro, setErrorFiltro] = useState('')
  const solicitud = useMemo(() => ({ uid, filtros: aplicados }), [uid, aplicados])
  const consulta = useConsultaRemota(consultarGerencial, solicitud, { conservarDatos: true, claveDatos: uid })
  const r = consulta.datos, bloqueado = consulta.pendiente || Boolean(consulta.error)
  function aplicar(e) {
    e.preventDefault()
    try { const f = filtroReporte(edicion); setErrorFiltro(''); setAplicados(f) } catch (error) { setErrorFiltro(error.message) }
  }
  function campo(nombre, valor) { setEdicion(f => ({ ...f, [nombre]: valor })); setErrorFiltro('') }
  const contextoGastos = r ? JSON.stringify([r.filtros.desde, r.filtros.hasta, r.filtros.sesion_id, r.filtros.zona_horaria]) : ''
  const avisos = r?.estimacion.advertencias ?? []
  return <div className="vz-reportes">
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="grafico"/>LA VENEZIANA · VISIÓN GERENCIAL</p><h1 className="vz-page-title">Reportes gerenciales</h1><p className="vz-page-description">Ventas, cobros y costos registrados para decidir con contexto.</p></div><div className="vz-report-acciones"><BotonBase onClick={consulta.reintentar} disabled={consulta.pendiente}>Actualizar reporte</BotonBase><BotonBase className="bg-marca-dorado text-texto" disabled={bloqueado || !r} onClick={() => descargarReporte(csvReporte(r), 'text/csv;charset=utf-8', `veneziana-reporte-${r.filtros.desde}-${r.filtros.hasta}.csv`)}>Exportar reporte CSV</BotonBase></div></header>
    <form className="vz-report-filtros" onSubmit={aplicar} aria-label="Filtros gerenciales">
      <label>Desde<input aria-label="Desde" type="date" required value={edicion.desde} onChange={e => campo('desde', e.target.value)}/></label>
      <label>Hasta<input aria-label="Hasta" type="date" required value={edicion.hasta} onChange={e => campo('hasta', e.target.value)}/></label>
      <label>Estado de venta<select aria-label="Estado de venta" value={edicion.estado} onChange={e => campo('estado', e.target.value)}><option value="emitida">Emitidas</option><option value="anulada">Anuladas</option><option value="rechazada_sunat">Rechazadas SUNAT</option><option value="todos">Todos los estados</option></select></label>
      <label>Sesión de caja (ID)<input aria-label="Sesión de caja (ID)" inputMode="numeric" value={edicion.sesion_id ?? ''} placeholder="Todas" onChange={e => campo('sesion_id', e.target.value)}/></label>
      <label>Zona horaria<select aria-label="Zona horaria" value={edicion.zona_horaria} onChange={e => campo('zona_horaria', e.target.value)}><option value="America/Lima">Perú · America/Lima</option><option value="UTC">UTC</option></select></label>
      <BotonBase type="submit" disabled={consulta.pendiente}>Aplicar filtros</BotonBase>
      <p>Moneda: PEN · Fechas inclusivas · Máximo 366 días. Editar filtros no cambia el reporte hasta aplicarlos.</p>
    </form>
    {errorFiltro && <p role="alert" className="vz-report-alerta">{errorFiltro}</p>}
    {consulta.error && <div role="alert" className="vz-report-alerta"><p>{consulta.error}</p><BotonBase onClick={consulta.reintentar}>Reintentar reporte</BotonBase></div>}
    {consulta.pendiente && <p role="status" className="vz-report-consultando">Consultando reporte… {r ? 'Los resultados visibles corresponden a la consulta anterior; las exportaciones están deshabilitadas.' : 'Esperando la información oficial.'}</p>}
    {r && <>
      <div className="vz-report-contexto"><strong>Resultados: {r.filtros.desde} al {r.filtros.hasta}</strong><span>Estado: {r.filtros.estado} · Sesión: {r.filtros.sesion_id ?? 'todas'} · {r.filtros.zona_horaria} · PEN</span><small>Consultado: {new Date(r.consultado_en).toLocaleString('es-PE', { timeZone: r.filtros.zona_horaria })}</small></div>
      <div className="vz-report-kpis">
        <Indicador titulo="Ventas con impuesto" importe={r.ventas.total} detalle={`${r.ventas.cantidad} ventas seleccionadas`} tono="dorado"/>
        <Indicador titulo="Ticket promedio" importe={r.ventas.ticket_promedio} detalle="Sobre las ventas seleccionadas" tono="lima"/>
        <Indicador titulo="Devoluciones del periodo" importe={r.devoluciones_periodo} detalle="Por fecha y sesión del desembolso" tono="rojo"/>
        <Indicador titulo="Gastos registrados" importe={r.gastos.total} detalle="Sin duplicar el egreso vinculado" tono="dorado"/>
      </div>
      {!r.estimacion.completa && <section className="vz-report-alerta" aria-label="Calidad del reporte"><h2>Estimación incompleta</h2><p>El margen no está disponible. Revisa estas condiciones:</p><ul>{avisos.map(a => <li key={a}>{AVISOS_REPORTE[a] ?? 'Hay una advertencia adicional del servidor que requiere revisión.'}</li>)}</ul></section>}
      <GraficosGerenciales reporte={r} bloqueado={bloqueado}/>
      <section className="vz-report-panel"><header><div><h2>Medios de pago · importes exactos</h2><p>Cobros de las ventas y devoluciones desembolsadas en el periodo. El neto puede ser negativo.</p></div></header>
        <div className="vz-report-scroll"><table><caption className="sr-only">Importes por medio de pago en soles</caption><thead><tr><th>Medio</th><th>Cobrado</th><th>Devuelto</th><th>Neto</th></tr></thead><tbody>{r.medios.map(m => <tr key={m.metodo}><th scope="row">{MEDIOS_REPORTE[m.metodo]}</th><td>{monedaReporte(m.cobrado)}</td><td>{monedaReporte(m.devuelto)}</td><td>{monedaReporte(m.neto)}</td></tr>)}</tbody></table></div>
        <p className="vz-report-nota">Neto comercial del periodo, con impuesto: <strong>{monedaReporte(r.neto_comercial_periodo_incluye_impuesto)}</strong>. No representa utilidad.</p>
      </section>
      <div className="vz-report-graficos"><section className="vz-report-panel"><h2>Costos y resultado referencial</h2><dl className="vz-report-lista"><Dato etiqueta="Base registrada de las ventas" valor={r.ventas.base_registrada}/><Dato etiqueta="Impuesto registrado" valor={r.ventas.impuesto_registrado}/><Dato etiqueta="Costo histórico de la cohorte" valor={r.costos.cohorte_ventas}/><Dato etiqueta="Margen base menos costo" valor={r.estimacion.margen_base_menos_costo}/><Dato etiqueta="Resultado tras gastos" valor={r.estimacion.resultado_tras_gastos}/></dl><p className="vz-report-nota">Estimación interna actualizable de las ventas seleccionadas y sus costos conocidos. No equivale al flujo de caja ni a un cierre contable o tributario.</p></section>
      <section className="vz-report-panel"><h2>Clasificación y movimientos</h2><dl className="vz-report-lista">{Object.entries(r.gastos.por_clase).map(([k, v]) => <Dato key={k} etiqueta={CLASES_REPORTE[k]} valor={v}/>)}<Dato etiqueta="Egresos sin gasto vinculado" valor={r.movimientos.egresos_sin_gasto}/><Dato etiqueta="Gastos globales sin asignación" valor={r.gastos.sin_asignacion_sesion_en_periodo}/></dl><p className="vz-report-nota">Un egreso no es automáticamente un gasto. El principal de deuda permanece separado de intereses y comisiones.</p></section></div>
      <GastosReporte key={contextoGastos} filtros={r.filtros} uid={uid}/>
      <details className="vz-report-panel"><summary>Salidas físicas y movimientos del periodo</summary><dl className="vz-report-lista"><Dato etiqueta="Ingresos de caja" valor={r.movimientos.ingresos}/><Dato etiqueta="Egresos de caja" valor={r.movimientos.egresos}/>{r.costos.salidas_periodo.map(s => <Dato key={s.tipo} etiqueta={`${({ SALIDA_VENTA: 'Salidas por venta', SALIDA_MERMA: 'Mermas', SALIDA_AJUSTE: 'Ajustes de salida' })[s.tipo]}${s.sin_costo ? ` · ${s.sin_costo} sin costo` : ''}`} valor={s.costo}/>)}</dl><p className="vz-report-nota">Por fecha del movimiento físico; puede diferir de la cohorte de ventas. No sumar ambos costos ni restar los egresos como otro gasto.</p></details>
      <details className="vz-report-panel"><summary>Criterios del reporte</summary><ul className="vz-report-criterios">{Object.entries(r.politica ?? {}).map(([k, v]) => <li key={k}>{v}</li>)}</ul><p className="vz-report-nota">El CSV contiene el resumen completo y la serie diaria. Los PNG muestran el gráfico y sus filtros, con valores visuales aproximados; tablas y archivos conservan los importes oficiales.</p></details>
    </>}
  </div>
}
function Indicador({ titulo, importe, detalle, tono }) { return <article className={`vz-report-kpi tono-${tono}`}><p>{titulo}</p><strong>{monedaReporte(importe)}</strong><small>{detalle}</small></article> }
function Dato({ etiqueta, valor }) { return <div><dt>{etiqueta}</dt><dd>{monedaReporte(valor)}</dd></div> }
