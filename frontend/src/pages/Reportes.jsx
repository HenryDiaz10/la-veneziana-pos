import {useMemo,useState,useRef} from 'react'
import {Link} from 'react-router-dom'
import {useAuthStore} from '../stores/auth.store.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import {consultarGerencial,descargarReporte} from '../services/reportes.service.js'
import {filtrosInicialesReporte,filtroReporte,monedaReporte,MEDIOS_REPORTE,AVISOS_REPORTE,csvAnalitica} from '../utils/reportes.js'
import {resumenComprasGastos} from '../utils/compras-gastos.js'
import {csvResultados} from '../utils/resultados.js'
import {imprimirVistaReporte} from '../utils/reporte-pdf.js'
import GraficosGerenciales from '../components/reportes/GraficosGerenciales.jsx'
import AnaliticaGraficos from '../components/reportes/AnaliticaGraficos.jsx'
import EstadoFinanciero from '../components/reportes/EstadoFinanciero.jsx'
import ActividadFinanciera from '../components/reportes/ActividadFinanciera.jsx'
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
  const contenido=useRef(null),[exportando,setExportando]=useState(false),[errorPdf,setErrorPdf]=useState('')
  const [revisionGastos,setRevisionGastos]=useState(0),[vista,setVista]=useState('resumen')
  const [aplicados,setAplicados]=useState(filtrosInicialesReporte)
  const [edicion,setEdicion]=useState(()=>({...aplicados,sesion_id:'',canal:'todos',mesero_id:''})),[errorFiltro,setErrorFiltro]=useState('')
  const solicitud=useMemo(()=>({uid,filtros:aplicados,financiero}),[uid,aplicados,financiero])
  const consulta=useConsultaRemota(consultarGerencial,solicitud,{conservarDatos:true,claveDatos:uid})
  const r=consulta.datos,bloqueado=consulta.pendiente||Boolean(consulta.error),a=r?.analitica
  const titulo=financiero?'Estado de resultados':'Reportes gerenciales'
  const vistas=[['resumen',financiero?'Resultado del negocio':'Resumen'],...(!financiero?[['ventas','Ventas y atención']]:[]),['compras','Compras y gastos'],['documentos','Documentos y caja']]
  async function guardarPdf(){
    setErrorPdf('');setExportando(true)
    try{await imprimirVistaReporte({contenido:contenido.current,titulo,vista:vistas.find(([id])=>id===vista)[1],reporte:r,onFinalizar:()=>setExportando(false)})}
    catch{setExportando(false);setErrorPdf('No se pudo preparar el PDF. Reintenta cuando termine de cargar la vista.')}
  }
  function campo(nombre,valor){setEdicion(f=>({...f,[nombre]:valor}));setErrorFiltro('')}
  function aplicar(e){e.preventDefault();try{setAplicados(filtroReporte(edicion));setErrorFiltro('')}catch(e){setErrorFiltro(e.message)}}
  function rapido(tipo){
    const hoy=filtrosInicialesReporte().hasta,[ano,mes]=hoy.split('-'),m=Number(mes)
    const desde=tipo==='mes'?`${ano}-${mes}-01`:tipo==='trimestre'?`${ano}-${String(Math.floor((m-1)/3)*3+1).padStart(2,'0')}-01`:tipo==='ano'?`${ano}-01-01`:new Date(Date.parse(hoy+'T00:00:00Z')-6*86400000).toISOString().slice(0,10)
    const f={...edicion,desde,hasta:hoy};setEdicion(f);setAplicados(filtroReporte(f));setErrorFiltro('')
  }
  return <div className={`vz-reportes ${financiero?'vz-estado-resultados':''}`}>
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre={financiero?'billete':'grafico'}/>LA VENEZIANA · {financiero?'FINANZAS':'VISIÓN GERENCIAL'}</p><h1 className="vz-page-title">{titulo}</h1><p className="vz-page-description">{financiero?'Conoce el resultado de tus ventas y en qué se utiliza el dinero.':'Los números importantes de tu negocio, en un solo lugar.'}</p></div>
      <div className="vz-report-acciones">
        <RegistrarGasto compacto uid={uid} onGuardado={()=>{setRevisionGastos(v=>v+1);consulta.reintentar()}}/>
        <BotonBase onClick={consulta.reintentar} disabled={consulta.pendiente}>Actualizar reporte</BotonBase>
        <BotonBase className="border border-app-borde" disabled={bloqueado||!r} onClick={()=>descargarReporte(financiero?csvResultados(r):csvAnalitica(r),'text/csv;charset=utf-8',`veneziana-${financiero?'resultados':'gerencial'}-${r.filtros.desde}-${r.filtros.hasta}.csv`)}>Exportar CSV</BotonBase>
        <BotonBase className="border border-app-borde" disabled={bloqueado||!r||exportando} onClick={guardarPdf}>Guardar vista en PDF</BotonBase>
      </div>
    </header>
    <nav className="vz-report-tabs" aria-label="Tipo de reporte"><Link to="/reportes" aria-current={!financiero?'page':undefined}>Reportes gerenciales</Link><Link to="/estado-resultados" aria-current={financiero?'page':undefined}>Estado de resultados</Link></nav>
    <section className="vz-report-periodo-panel" aria-label="Periodo del reporte">
      <div className="vz-report-periodos" aria-label="Periodos rápidos">{[['semana','Últimos 7 días'],['mes','Mes actual'],['trimestre','Trimestre'],['ano','Año actual']].map(([k,v])=><BotonBase key={k} onClick={()=>rapido(k)} disabled={consulta.pendiente}>{v}</BotonBase>)}</div>
      <form className="vz-report-filtros vz-report-filtros-compactos" onSubmit={aplicar} aria-label="Filtros gerenciales">
        <label>Desde<input aria-label="Desde" type="date" required value={edicion.desde} onChange={e=>campo('desde',e.target.value)}/></label>
        <label>Hasta<input aria-label="Hasta" type="date" required value={edicion.hasta} onChange={e=>campo('hasta',e.target.value)}/></label>
        <BotonBase type="submit" className="border border-app-borde" disabled={consulta.pendiente}>Aplicar filtros</BotonBase>
        <details className="vz-report-filtros-avanzados"><summary>Más filtros{aplicados.sesion_id||aplicados.canal||aplicados.mesero_id||aplicados.estado!=='emitida'||aplicados.zona_horaria!=='America/Lima'?' · hay filtros activos':''}</summary><div className="vz-report-avanzados-grid">
          {!financiero&&<><label>Estado de venta<select aria-label="Estado de venta" value={edicion.estado} onChange={e=>campo('estado',e.target.value)}><option value="emitida">Emitidas</option><option value="anulada">Anuladas</option><option value="rechazada_sunat">Rechazadas SUNAT</option><option value="todos">Todos los estados</option></select></label><label>Canal<select aria-label="Canal" value={edicion.canal} onChange={e=>campo('canal',e.target.value)}><option value="todos">Todos los canales</option><option value="salon">Salón</option><option value="llevar">Para llevar</option><option value="delivery">Delivery</option></select></label><label>Mesero / responsable<select aria-label="Mesero / responsable" value={edicion.mesero_id} onChange={e=>campo('mesero_id',e.target.value)}><option value="">Todos los responsables</option>{(a?.responsables??a?.meseros??[]).map(m=><option key={m.usuario_id} value={String(m.usuario_id)}>{m.nombre}</option>)}</select></label></>}
          <label>Sesión de caja (ID)<input aria-label="Sesión de caja (ID)" inputMode="numeric" value={edicion.sesion_id??''} placeholder="Todas" onChange={e=>campo('sesion_id',e.target.value)}/></label>
          <label>Zona horaria<select aria-label="Zona horaria" value={edicion.zona_horaria} onChange={e=>campo('zona_horaria',e.target.value)}><option value="America/Lima">Perú · America/Lima</option><option value="UTC">UTC</option></select></label>
        </div><p className="vz-report-nota">Los filtros de venta no limitan las compras. Aplica para actualizar todas las vistas. Fechas inclusivas, hasta 366 días.</p></details>
      </form>
    </section>
    {errorFiltro&&<p role="alert" className="vz-report-alerta">{errorFiltro}</p>}
    {errorPdf&&<p role="alert" className="vz-report-alerta">{errorPdf}</p>}
    {consulta.error&&<div role="alert" className="vz-report-alerta"><p>{consulta.error}</p><BotonBase onClick={consulta.reintentar}>Reintentar reporte</BotonBase></div>}
    {consulta.pendiente&&<p role="status" className="vz-report-consultando">Consultando reporte… {r?'Los resultados visibles corresponden a la consulta anterior; las exportaciones están deshabilitadas.':'Esperando los registros del sistema.'}</p>}
    {r&&<>
      <div className="vz-report-contexto"><strong>{r.filtros.desde} al {r.filtros.hasta}</strong><span>{r.filtros.estado} · {r.filtros.canal??'todos los canales'} · Sesión {r.filtros.sesion_id??'todas'} · Responsable {r.filtros.mesero_id??'todos'}</span><small>Actualizado: {new Date(r.consultado_en).toLocaleString('es-PE',{timeZone:r.filtros.zona_horaria})}</small></div>
      {/* Cambiar de vista conserva filtros y datos; evita cargar otra vez el reporte. */}
      <nav className="vz-report-vistas" aria-label="Contenido del reporte">{vistas.map(([id,nombre])=><button key={id} type="button" aria-pressed={vista===id} onClick={()=>setVista(id)}>{nombre}</button>)}</nav>
      <p className="vz-report-exportar-ayuda">PDF: <strong>{vistas.find(([id])=>id===vista)[1]}</strong> · Pulsa «Guardar vista en PDF» y elige «Guardar como PDF» en la ventana de impresión.</p>
      <div className="vz-report-contenido" ref={contenido} key={vista}>
        {vista==='resumen'&&(financiero?<>
          {!r.estimacion.completa&&<details className="vz-report-alerta"><summary>Hay datos pendientes para calcular el resultado</summary><ul>{r.estimacion.advertencias.map(k=><li key={k}>{AVISOS_REPORTE[k]??k}</li>)}</ul></details>}
          <EstadoFinanciero reporte={r}/>
          <p className="vz-report-ayuda">Para revisar pagos a proveedores y otros gastos, abre <button onClick={()=>setVista('compras')}>Compras y gastos</button>. Los documentos están en <button onClick={()=>setVista('documentos')}>Documentos y caja</button>.</p>
        </>:<>
          <div className="vz-report-kpis"><Indicador titulo="Ventas del periodo" importe={monedaReporte(r.ventas.total)} detalle={`${r.ventas.cantidad} tickets · con IGV`} tono="lima"/><Indicador titulo="Compras confirmadas" importe={monedaReporte(r.compras?.total??null)} detalle={`${r.compras?.cantidad??0} documentos · con IGV`} tono="rojo"/><Indicador titulo="Compras y otros gastos" importe={monedaReporte(resumenComprasGastos(r)?.total??null)} detalle="Compras confirmadas + otros gastos registrados" tono="azul"/><Indicador titulo="Ticket promedio" importe={monedaReporte(r.ventas.ticket_promedio)} detalle="Promedio por venta" tono="dorado"/></div>
          <ActividadFinanciera vista="resumen" reporte={r} bloqueado={bloqueado}/>
          <div className="vz-report-accesos"><button onClick={()=>setVista('ventas')}><strong>¿Qué se vende más?</strong><span>Productos, horarios y atención de meseros →</span></button><button onClick={()=>setVista('compras')}><strong>¿En qué se utiliza el dinero?</strong><span>Compras, proveedores y gastos →</span></button></div>
        </>)}
        {vista==='ventas'&&!financiero&&<>
          <div className="vz-report-kpis"><Indicador titulo="Ventas con impuesto" importe={monedaReporte(r.ventas.total)} detalle={`${r.ventas.cantidad} tickets`} tono="dorado"/><Indicador titulo="Ticket promedio" importe={monedaReporte(r.ventas.ticket_promedio)} detalle="Por venta seleccionada" tono="lima"/><Indicador titulo="Productos con ventas" importe={String(a?.productos_vendidos??0)} detalle="Variantes agrupadas" tono="azul"/><Indicador titulo="Productos sin ventas" importe={String(a?.sin_ventas.cantidad??0)} detalle="Catálogo activo" tono="rojo"/></div>
          {r.filtros.estado!=='emitida'&&<p className="vz-report-alerta">Se muestran documentos {r.filtros.estado}. Estos importes no equivalen a ventas emitidas vigentes.</p>}
          <GraficosGerenciales reporte={r} bloqueado={bloqueado}/><AnaliticaGraficos reporte={r} bloqueado={bloqueado}/>
        </>}
        {vista==='compras'&&<ActividadFinanciera vista="compras" reporte={r} bloqueado={bloqueado}/>}
        {vista==='documentos'&&<>
          <ActividadFinanciera vista="documentos" reporte={r} bloqueado={bloqueado}/>
          <GastosReporte key={`${JSON.stringify(r.filtros)}-${revisionGastos}`} filtros={r.filtros} uid={uid}/>
          <details className="vz-report-panel"><summary>Cobros y devoluciones por medio de pago</summary><div className="vz-report-scroll"><table><caption className="sr-only">Medios de pago en soles</caption><thead><tr><th>Medio</th><th>Cobrado</th><th>Devuelto</th><th>Neto</th></tr></thead><tbody>{r.medios.map(m=><tr key={m.metodo}><th scope="row">{MEDIOS_REPORTE[m.metodo]}</th><td>{monedaReporte(m.cobrado)}</td><td>{monedaReporte(m.devuelto)}</td><td>{monedaReporte(m.neto)}</td></tr>)}</tbody></table></div></details>
        </>}
      </div>
      <details className="vz-report-panel vz-report-criterios-lectura"><summary>Cómo leer estos importes</summary><p className="vz-report-nota">Las compras abastecen inventario; la utilidad descuenta su costo consumido. Un gasto vinculado a caja no se suma nuevamente como egreso. Las compras se filtran por fecha de emisión y muestran el estado actual de pago; no representan una fecha bancaria de desembolso. Los resultados son referenciales y dependen de datos completos.</p></details>
    </>}
  </div>
}
function Indicador({titulo,importe,detalle,tono}){return <article className={`vz-report-kpi tono-${tono}`}><p>{titulo}</p><strong>{importe}</strong><small>{detalle}</small></article>}
