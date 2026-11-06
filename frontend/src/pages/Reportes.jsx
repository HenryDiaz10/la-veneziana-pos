import {useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuthStore} from '../stores/auth.store.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import {consultarGerencial,descargarReporte} from '../services/reportes.service.js'
import {filtrosInicialesReporte,filtroReporte,monedaReporte,MEDIOS_REPORTE,AVISOS_REPORTE,csvAnalitica} from '../utils/reportes.js'
import {csvResultados} from '../utils/resultados.js'
import GraficosGerenciales from '../components/reportes/GraficosGerenciales.jsx'
import AnaliticaGraficos from '../components/reportes/AnaliticaGraficos.jsx'
import EstadoFinanciero from '../components/reportes/EstadoFinanciero.jsx'
import GastosReporte from '../components/reportes/GastosReporte.jsx'
import RegistrarGasto from '../components/reportes/RegistrarGasto.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import Icono from '../components/ui/Icono.jsx'
import '../styles/reportes.css'

export default function Reportes({financiero=false}) {
  const uid=useAuthStore(s=>s.usuario?.id)
  return <ContenidoReportes key={`${uid}-${financiero}`} uid={uid} financiero={financiero}/>
}
function ContenidoReportes({uid,financiero}) {
  const [revisionGastos,setRevisionGastos]=useState(0)
  const [aplicados,setAplicados]=useState(filtrosInicialesReporte)
  const [edicion,setEdicion]=useState(()=>({...aplicados,sesion_id:'',canal:'todos',mesero_id:''})),[errorFiltro,setErrorFiltro]=useState('')
  const solicitud=useMemo(()=>({uid,filtros:aplicados,financiero}),[uid,aplicados,financiero])
  const consulta=useConsultaRemota(consultarGerencial,solicitud,{conservarDatos:true,claveDatos:uid})
  const r=consulta.datos,bloqueado=consulta.pendiente||Boolean(consulta.error)
  const titulo=financiero?'Estado de resultados':'Reportes gerenciales'
  function campo(nombre,valor){setEdicion(f=>({...f,[nombre]:valor}));setErrorFiltro('')}
  function aplicar(e){e.preventDefault();try{setAplicados(filtroReporte(edicion));setErrorFiltro('')}catch(e){setErrorFiltro(e.message)}}
  function rapido(tipo){
    const hoy=filtrosInicialesReporte().hasta,[ano,mes]=hoy.split('-'),m=Number(mes)
    const desde=tipo==='mes'?`${ano}-${mes}-01`:tipo==='trimestre'?`${ano}-${String(Math.floor((m-1)/3)*3+1).padStart(2,'0')}-01`:tipo==='ano'?`${ano}-01-01`:filtrosInicialesReporte().desde
    const f={...edicion,desde,hasta:hoy};setEdicion(f);setAplicados(filtroReporte(f));setErrorFiltro('')
  }
  const a=r?.analitica
  return <div className={`vz-reportes ${financiero?'vz-estado-resultados':''}`}>
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre={financiero?'billete':'grafico'}/>LA VENEZIANA · {financiero?'FINANZAS':'VISIÓN GERENCIAL'}</p><h1 className="vz-page-title">{titulo}</h1><p className="vz-page-description">{financiero?'Ventas netas, costos históricos y cuatro niveles de utilidad.':'Descubre qué se vende, cuándo se vende y cómo se atiende tu salón.'}</p></div><div className="vz-report-acciones"><BotonBase onClick={consulta.reintentar} disabled={consulta.pendiente}>Actualizar reporte</BotonBase><BotonBase className="bg-marca-dorado text-texto" disabled={bloqueado||!r} onClick={()=>descargarReporte(financiero?csvResultados(r):csvAnalitica(r),'text/csv;charset=utf-8',`veneziana-${financiero?'resultados':'gerencial'}-${r.filtros.desde}-${r.filtros.hasta}.csv`)}>Exportar CSV</BotonBase>{financiero&&<BotonBase disabled={bloqueado||!r} onClick={()=>window.print()}>Imprimir / guardar PDF</BotonBase>}</div></header>
    <div className="vz-report-tabs"><Link to="/reportes" aria-current={!financiero?'page':undefined}>Análisis de ventas</Link><Link to="/estado-resultados" aria-current={financiero?'page':undefined}>Estado de resultados</Link></div>
    <div className="vz-report-periodos" aria-label="Periodos rápidos">{[['semana','Últimos 7 días'],['mes','Mes actual'],['trimestre','Trimestre'],['ano','Año actual']].map(([k,v])=><BotonBase key={k} onClick={()=>rapido(k)} disabled={consulta.pendiente}>{v}</BotonBase>)}</div>
    <form className="vz-report-filtros" onSubmit={aplicar} aria-label="Filtros gerenciales">
      <label>Desde<input aria-label="Desde" type="date" required value={edicion.desde} onChange={e=>campo('desde',e.target.value)}/></label>
      <label>Hasta<input aria-label="Hasta" type="date" required value={edicion.hasta} onChange={e=>campo('hasta',e.target.value)}/></label>
      {!financiero&&<><label>Estado de venta<select aria-label="Estado de venta" value={edicion.estado} onChange={e=>campo('estado',e.target.value)}><option value="emitida">Emitidas</option><option value="anulada">Anuladas</option><option value="rechazada_sunat">Rechazadas SUNAT</option><option value="todos">Todos los estados</option></select></label><label>Canal<select aria-label="Canal" value={edicion.canal} onChange={e=>campo('canal',e.target.value)}><option value="todos">Todos los canales</option><option value="salon">Salón</option><option value="llevar">Para llevar</option><option value="delivery">Delivery</option></select></label><label>Mesero / responsable<select aria-label="Mesero / responsable" value={edicion.mesero_id} onChange={e=>campo('mesero_id',e.target.value)}><option value="">Todos los responsables</option>{(a?.responsables??a?.meseros??[]).map(m=><option key={m.usuario_id} value={String(m.usuario_id)}>{m.nombre}</option>)}</select></label></>}
      <label>Sesión de caja (ID)<input aria-label="Sesión de caja (ID)" inputMode="numeric" value={edicion.sesion_id??''} placeholder="Todas" onChange={e=>campo('sesion_id',e.target.value)}/></label>
      <label>Zona horaria<select aria-label="Zona horaria" value={edicion.zona_horaria} onChange={e=>campo('zona_horaria',e.target.value)}><option value="America/Lima">Perú · America/Lima</option><option value="UTC">UTC</option></select></label>
      <BotonBase type="submit" disabled={consulta.pendiente}>Aplicar filtros</BotonBase><p>PEN · Fechas inclusivas · Hasta 366 días. Edita y aplica para actualizar todos los gráficos.</p>
    </form>
    {errorFiltro&&<p role="alert" className="vz-report-alerta">{errorFiltro}</p>}
    {consulta.error&&<div role="alert" className="vz-report-alerta"><p>{consulta.error}</p><BotonBase onClick={consulta.reintentar}>Reintentar reporte</BotonBase></div>}
    {consulta.pendiente&&<p role="status" className="vz-report-consultando">Consultando reporte… {r?'Los resultados visibles corresponden a la consulta anterior; las exportaciones están deshabilitadas.':'Esperando los registros del sistema.'}</p>}
    {r&&<>
      <div className="vz-report-contexto"><strong>{r.filtros.desde} al {r.filtros.hasta}</strong><span>{r.filtros.estado} · {r.filtros.canal??'todos los canales'} · Sesión {r.filtros.sesion_id??'todas'} · Responsable {r.filtros.mesero_id??'todos'} · {r.filtros.zona_horaria}</span><small>Consultado: {new Date(r.consultado_en).toLocaleString('es-PE',{timeZone:r.filtros.zona_horaria})}</small></div>
      {financiero?<>
        {!r.estimacion.completa&&<section className="vz-report-alerta"><h2>Datos pendientes del resultado</h2><ul>{r.estimacion.advertencias.map(k=><li key={k}>{AVISOS_REPORTE[k]??k}</li>)}</ul></section>}
        <EstadoFinanciero reporte={r}/>
        <RegistrarGasto uid={uid} onGuardado={()=>{setRevisionGastos(v=>v+1);consulta.reintentar()}}/>
        {r.compras&&<section className="vz-report-panel"><h2>Compras y proveedores · control de pagos</h2><dl className="vz-report-lista"><Dato etiqueta="Compras registradas, con IGV" valor={r.compras.total}/><Dato etiqueta="Compras pagadas (estado actual)" valor={r.compras.saldadas}/><Dato etiqueta="Saldo pendiente" valor={r.compras.saldo_pendiente}/></dl><p className="vz-report-nota">Por fecha de emisión de la compra, sin filtro de sesión. No equivale al flujo bancario ni se resta nuevamente de la utilidad.</p></section>}
        <GastosReporte key={`${JSON.stringify(r.filtros)}-${revisionGastos}`} filtros={r.filtros} uid={uid}/>
      </>:<>
        <div className="vz-report-kpis"><Indicador titulo="Ventas con impuesto" importe={monedaReporte(r.ventas.total)} detalle={`${r.ventas.cantidad} tickets`} tono="dorado"/><Indicador titulo="Ticket promedio" importe={monedaReporte(r.ventas.ticket_promedio)} detalle="Por venta seleccionada" tono="lima"/><Indicador titulo="Productos con ventas" importe={String(a?.productos_vendidos??0)} detalle="Productos distintos, variantes agrupadas" tono="azul"/><Indicador titulo="Productos sin ventas" importe={String(a?.sin_ventas.cantidad??0)} detalle="Catálogo activo en estos filtros" tono="rojo"/></div>
        {r.filtros.estado!=='emitida'&&<p className="vz-report-alerta">Se muestran documentos {r.filtros.estado}. Estos importes no equivalen a ventas emitidas vigentes.</p>}
        <GraficosGerenciales reporte={r} bloqueado={bloqueado}/><AnaliticaGraficos reporte={r} bloqueado={bloqueado}/>
        <section className="vz-report-panel"><h2>Cobros y devoluciones · importes exactos</h2><div className="vz-report-scroll"><table><caption className="sr-only">Medios de pago en soles</caption><thead><tr><th>Medio</th><th>Cobrado</th><th>Devuelto</th><th>Neto</th></tr></thead><tbody>{r.medios.map(m=><tr key={m.metodo}><th scope="row">{MEDIOS_REPORTE[m.metodo]}</th><td>{monedaReporte(m.cobrado)}</td><td>{monedaReporte(m.devuelto)}</td><td>{monedaReporte(m.neto)}</td></tr>)}</tbody></table></div></section>
      </>}
      <details className="vz-report-panel"><summary>Criterios de lectura</summary><p className="vz-report-nota">{financiero?'Las compras, gastos operativos, financieros e impuestos tienen funciones distintas. Los resultados dependen de datos completos y provisiones registradas.':'Los importes se agregan por ticket y las unidades por líneas comerciales. Los pagos mixtos no duplican ventas. Los días y horas se calculan en la zona seleccionada.'}</p></details>
    </>}
  </div>
}
function Indicador({titulo,importe,detalle,tono}){return <article className={`vz-report-kpi tono-${tono}`}><p>{titulo}</p><strong>{importe}</strong><small>{detalle}</small></article>}
function Dato({etiqueta,valor}){return <div><dt>{etiqueta}</dt><dd>{monedaReporte(valor)}</dd></div>}
