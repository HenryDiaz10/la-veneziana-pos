import {Grafico} from './AnaliticaGraficos.jsx'
import {monedaReporte} from '../../utils/reportes.js'

const nombre=c=>`${c.nombre} · #${c.id}`
const fecha=(v,zona)=>new Date(v).toLocaleDateString('es-PE',{timeZone:zona})
function Indicador({titulo,valor,detalle,tono='dorado'}){return <article className={`vz-report-kpi tono-${tono}`}><p>{titulo}</p><strong>{valor}</strong><small>{detalle}</small></article>}
export default function MisClientes({reporte:r,bloqueado}){
  const c=r.clientes
  if(!c)return <p className="vz-report-alerta">Actualiza el servidor y el reporte para consultar la analítica de clientes.</p>
  const s=c.resumen,comunes={reporte:r,bloqueado},destacado=c.ranking_ingresos[0]
  return <>
    <div className="vz-section-head"><div><h2 className="vz-section-title">Mis clientes</h2><p className="vz-report-nota">Conoce quién regresa, qué compra y cuánto aporta al negocio.</p></div></div>
    <div className="vz-report-kpis">
      <Indicador titulo="Clientes compradores" valor={String(s.activos)} detalle={`${s.nuevos} nuevos · ${s.regresaron} ya habían comprado`} tono="azul"/>
      <Indicador titulo="Ingreso neto identificado" valor={monedaReporte(s.ingreso_neto)} detalle="Ventas con cliente menos sus devoluciones" tono="lima"/>
      <Indicador titulo="Compras por cliente" valor={s.compras_por_cliente} detalle={`${s.compras_identificadas} tickets con cliente en el periodo`}/>
      <Indicador titulo="Recompra en el periodo" valor={`${s.recompra_porcentaje} %`} detalle={`${s.recurrentes} clientes con 2 o más compras`} tono="rojo"/>
    </div>
    {r.filtros.estado!=='emitida'&&<p className="vz-report-alerta">Esta vista excluye ventas anuladas. Los demás estados respetan el filtro aplicado.</p>}
    {s.activos===0&&<p className="vz-report-panel">No hay compras con un cliente identificado en estos filtros. Las compras sin ficha se muestran por separado.</p>}
    <div className="vz-report-graficos">
      <Grafico {...comunes} titulo="Clientes que generan más ingresos" nota="Top 10 por venta neta: importe con IGV menos devoluciones." moneda filas={c.ranking_ingresos.slice(0,10).map(v=>({nombre:nombre(v),valor:v.neto}))}/>
      <Grafico {...comunes} color={3} titulo="Clientes más frecuentes" nota="Top 10 por cantidad de compras cobradas; cada ticket cuenta una vez." filas={c.ranking_frecuencia.map(v=>({nombre:nombre(v),valor:String(v.compras)}))}/>
      <Grafico {...comunes} color={2} titulo="Clientes que más productos compran" nota="Top 10 por unidades históricas; sin descontar unidades devueltas." filas={c.ranking_unidades.map(v=>({nombre:nombre(v),valor:v.unidades}))}/>
      <Grafico {...comunes} dona color={2} titulo="Nuevos y clientes que regresan" nota="Nuevo: su primera compra histórica ocurre dentro del periodo." filas={[{nombre:'Nuevos',valor:String(s.nuevos)},{nombre:'Ya habían comprado',valor:String(s.regresaron)}]}/>
      <Grafico {...comunes} color={4} titulo="Evolución de clientes compradores" nota={`Clientes distintos por ${c.granularidad==='mes'?'mes':'día'} · ${r.filtros.zona_horaria}. Un cliente puede aparecer en varios periodos.`} filas={c.evolucion.map(e=>({nombre:e.fecha,valor:String(e.clientes)}))}/>
      <Grafico {...comunes} dona color={3} titulo="Compras con y sin cliente" nota={`${s.identificacion_porcentaje} % de los tickets están vinculados a una ficha.`} filas={[{nombre:'Con cliente',valor:String(s.compras_identificadas)},{nombre:'Sin cliente identificado',valor:String(s.compras_sin_cliente)}]}/>
      <Grafico {...comunes} color={1} titulo="Productos favoritos de mis clientes" nota="Top 10 por unidades compradas en tickets con cliente identificado." filas={c.productos.map(p=>({nombre:p.nombre,valor:p.unidades}))}/>
      <section className="vz-report-panel vz-clientes-oportunidades"><h2>Oportunidades para cuidar a tus clientes</h2><dl>
        <div><dt>Una segunda compra por conquistar</dt><dd><strong>{s.una_compra}</strong> clientes hicieron una sola compra en el periodo.</dd></div>
        <div><dt>Conocer mejor a quien compra</dt><dd><strong>{s.compras_sin_cliente}</strong> tickets sin ficha · {monedaReporte(s.ingreso_sin_cliente)} netos sin identificar.</dd></div>
        <div><dt>Mayor aporte al negocio</dt><dd>{destacado?<><strong>{destacado.nombre}</strong> · {monedaReporte(destacado.neto)} netos en {destacado.compras} compras.</>:'Todavía no hay clientes identificados con compras en la selección.'}</dd></div>
      </dl></section>
    </div>
    <section className="vz-report-panel"><h2>Detalle de mis clientes · Top 20 por ingreso neto</h2><p className="vz-report-nota">{s.activos} clientes compradores en total. Nombres de la ficha actual; importes y unidades del historial de ventas.</p><div className="vz-report-scroll"><table><caption className="sr-only">Clientes por ingreso neto</caption><thead><tr><th>Cliente</th><th>Compras</th><th>Días con compra</th><th>Unidades</th><th>Ingreso neto</th><th>Neto por compra</th><th>Última compra</th></tr></thead><tbody>
      {c.ranking_ingresos.map(v=><tr key={v.id}><th scope="row">{v.nombre}<small className="vz-clientes-ficha">Ficha #{v.id} · {v.nuevo?'Nuevo':'Ya había comprado'}</small></th><td>{v.compras}</td><td>{v.dias}</td><td>{v.unidades}</td><td>{monedaReporte(v.neto)}</td><td>{monedaReporte(v.promedio_neto)}</td><td>{fecha(v.ultima_compra,r.filtros.zona_horaria)}</td></tr>)}
      {!c.ranking_ingresos.length&&<tr><td colSpan={7}>No hay clientes identificados con estos filtros.</td></tr>}
    </tbody></table></div></section>
    <p className="vz-report-nota">{c.alcance}</p>
  </>
}
