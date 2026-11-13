import {resumenComprasGastos} from '../../utils/compras-gastos.js'
import {monedaReporte} from '../../utils/reportes.js'
export default function ResumenComprasGastos({reporte}) {
  const r=resumenComprasGastos(reporte)
  if(!r)return null
  return <section className="vz-report-panel" aria-label="Total de compras y gastos registrados">
    <h2>Compras y otros gastos del periodo</h2>
    <dl className="vz-report-desglose-gastos"><div><dt>Compras confirmadas</dt><dd>{monedaReporte(r.compras)}</dd></div><div><dt>Otros gastos registrados</dt><dd>{monedaReporte(r.otros)}</dd></div><div className="vz-report-total-gastos"><dt>Total compras y gastos</dt><dd>{monedaReporte(r.total)}</dd></div></dl>
    <p className="vz-report-nota">Incluye las compras registradas, aunque tengan un pago pendiente. Es un total de documentos, no un saldo bancario. La utilidad utiliza el costo consumido del inventario, sin descontar otra vez la compra completa.</p>
  </section>
}
