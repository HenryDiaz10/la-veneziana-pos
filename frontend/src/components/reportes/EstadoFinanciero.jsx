import {nivelesResultado} from '../../utils/resultados.js'
import {monedaReporte,CLASES_REPORTE} from '../../utils/reportes.js'
import ResumenComprasGastos from './ResumenComprasGastos.jsx'
export default function EstadoFinanciero({reporte:r}) {
  const n=nivelesResultado(r),g=r.gastos.por_clase
  const filas=[
    ['Ventas netas registradas (sin IGV)',r.ventas.base_registrada],['− Costo de ventas histórico',r.costos.cohorte_ventas],
    ['1 · Utilidad bruta',n.bruta,'nivel'],['− Gastos operativos',g.operativo],['2 · Utilidad operativa',n.operativa,'nivel'],
    ['− Gastos financieros',g.financiero],['− Gastos extraordinarios',g.extraordinario],['3 · Utilidad antes de impuestos',n.antes_impuestos,'nivel'],
    ['− Provisión de impuesto registrada',g.provision_impuesto],['4 · Utilidad neta tras provisión',n.neta,'nivel']]
  return <>
    <div className="vz-report-kpis">{[['Ganancia bruta',n.bruta],['Ganancia operativa',n.operativa],['Antes de impuestos',n.antes_impuestos],['Resultado neto',n.neta]].map(([titulo,v],i)=><article className={`vz-report-kpi tono-${i===3?'lima':'dorado'}`} key={titulo}><p>{titulo}</p><strong>{v===null?"Pendiente":monedaReporte(v)}</strong><small>{["Ventas sin IGV menos costo consumido","Después de gastos operativos","Después de gastos financieros y otros",n.neta===null?"Requiere datos completos y provisión de impuesto":"Después de la provisión registrada"][i]}</small></article>)}</div>
    <ResumenComprasGastos reporte={r}/>
    <section className="vz-report-panel"><h2>Estado de resultados · cuatro niveles</h2><p className="vz-report-nota">Ventas netas menos costos consumidos y gastos clasificados. Los pagos de compras abastecen inventario y no se descuentan otra vez de este resultado.</p>
      <table className="vz-resultados-tabla"><caption className="sr-only">Desglose de resultados en soles</caption><thead><tr><th>Concepto / fórmula</th><th>Importe S/</th></tr></thead><tbody>{filas.map(([etiqueta,v,tipo])=><tr key={etiqueta} className={tipo==='nivel'?'vz-resultado-nivel':''}><th scope="row">{etiqueta}</th><td>{monedaReporte(v)}</td></tr>)}</tbody></table>
      <p className="vz-report-nota">No se aplica una tasa fija de impuesto a la renta. Si falta una provisión registrada, el nivel 4 queda pendiente. El IGV de ventas se muestra aparte: {monedaReporte(r.ventas.impuesto_registrado)}.</p>
      {!r.estimacion.completa&&<p className="vz-report-alerta">Los resultados calculados no están disponibles porque hay datos pendientes. Revisa las advertencias del periodo; no se sustituyen por cero.</p>}
    </section>
    <details className="vz-report-panel"><summary>Ver gastos por clasificación</summary><dl className="vz-report-lista">{Object.entries(g).map(([k,v])=><div key={k}><dt>{CLASES_REPORTE[k]}</dt><dd>{monedaReporte(v)}</dd></div>)}</dl><p className="vz-report-nota">La provisión de impuesto se descuenta únicamente en el nivel 4. El principal de préstamos no es gasto financiero. Resultado referencial sujeto a completitud y revisión contable.</p></details>
  </>
}
