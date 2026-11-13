import {useMemo,useState} from 'react'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import {consultarHistorial,consultarVenta} from '../services/historial-ventas.service.js'
import {filtrosInicialesReporte,MEDIOS_REPORTE} from '../utils/reportes.js'
import DataTable from '../components/ui/DataTable.jsx'
import Modal from '../components/ui/Modal.jsx'
import Badge from '../components/ui/Badge.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Icono from '../components/ui/Icono.jsx'
import TarjetaResumen from '../components/ui/TarjetaResumen.jsx'
import PaginacionClientes from '../components/clientes/PaginacionClientes.jsx'

const canales={salon:'En salón',llevar:'Para llevar',delivery:'Delivery'}
const estados={emitida:'Emitida',anulada:'Anulada',rechazada_sunat:'Rechazada SUNAT'}
const fecha=v=>new Date(v).toLocaleString('es-PE',{timeZone:'America/Lima'})
const monto=v=>`S/ ${v}`
function iniciales(){const f=filtrosInicialesReporte();return {desde:f.desde,hasta:f.hasta,estado:'todos',canal:'todos',medio:'todos',busqueda:''}}
const campo='vz-purchase-input mt-2 w-full'

function DetalleVenta({id,onCerrar}) {
  const solicitud=useMemo(()=>({id}),[id])
  const {datos:v,pendiente,error,reintentar}=useConsultaRemota(consultarVenta,solicitud)
  return <Modal titulo="Detalle de venta" onCerrar={onCerrar}>
    {pendiente&&<p role="status">Consultando venta…</p>}
    {error&&<div role="alert"><p>{error}</p><BotonBase onClick={reintentar}>Reintentar detalle</BotonBase></div>}
    {v&&<div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-titulo text-xl font-bold">{v.codigo}</h3><p className="mt-2 text-sm">{fecha(v.fecha)} · {canales[v.canal]}</p></div><Badge variante={v.estado==='anulada'?'peligro':'neutro'}>{estados[v.estado]??'Sin estado'}</Badge></div>
      <dl className="grid gap-3 rounded-xl border border-app-borde p-4 text-sm sm:grid-cols-2"><div><dt className="text-app-secundario">Cliente</dt><dd className="break-words font-bold">{v.cliente.nombre}</dd>{v.cliente.telefono&&<dd>{v.cliente.telefono}</dd>}</div><div><dt className="text-app-secundario">Pedido / mesa</dt><dd>{v.pedido}{v.mesa?` · ${v.mesa}`:''}</dd></div><div><dt className="text-app-secundario">Atendido por</dt><dd>{v.responsable??'Sin información'}</dd></div><div><dt className="text-app-secundario">Cajero</dt><dd>{v.cajero??'Sin información'}</dd></div></dl>
      <section><h3 className="mb-3 font-bold">Productos comprados</h3>{!v.lineas.length?<p className="text-sm text-app-secundario">Este registro no tiene detalle histórico de productos.</p>:<ul className="space-y-3">{v.lineas.map((l,i)=><li key={i} className="rounded-xl border border-app-borde p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong className="min-w-0 break-words">{l.cantidad} × {l.descripcion}</strong><strong>{monto(l.total)}</strong></div><p className="mt-1 text-app-secundario">Precio unitario: {monto(l.precio_unitario)}</p>{l.variante&&<p>{l.variante}</p>}{l.modificadores?.length>0&&<p className="break-words">{l.modificadores.join(', ')}</p>}{l.indicaciones&&<p className="mt-2 break-words text-app-secundario">Cocina: {l.indicaciones}</p>}</li>)}</ul>}</section>
      <dl className="space-y-2 border-t border-app-borde pt-4 text-sm">{[['Base gravada',v.base],['IGV',v.igv],['Descuento global',v.descuento],['Total de venta',v.total],['Devuelto',v.devuelto]].map(([nombre,valor])=><div key={nombre} className="flex flex-wrap justify-between gap-2"><dt>{nombre}</dt><dd className="font-mono font-bold">{monto(valor)}</dd></div>)}</dl>
      <section><h3 className="mb-2 font-bold">Medios de pago</h3><ul className="space-y-2 text-sm">{v.pagos.map((p,i)=><li key={i} className="rounded-lg bg-app-elevada p-3"><strong>{MEDIOS_REPORTE[p.metodo]??p.metodo}: {monto(p.importe)}</strong>{p.recibido&&<p className="mt-1">Efectivo recibido: {monto(p.recibido)} · Vuelto: {monto(p.vuelto??'0.00')}</p>}</li>)}</ul></section>
      {v.devoluciones.length>0&&<section><h3 className="mb-2 font-bold">Devoluciones registradas</h3>{v.devoluciones.map(d=><p key={d.id} className="mb-2 break-words text-sm">{fecha(d.fecha)} · {monto(d.total)} · {d.motivo}</p>)}</section>}
    </div>}
  </Modal>
}
export default function HistorialVentas(){
  const [formulario,setFormulario]=useState(iniciales)
  const [solicitud,setSolicitud]=useState(()=>({filtros:iniciales(),pagina:1}))
  const [seleccion,setSeleccion]=useState(null)
  const {datos,pendiente,error,reintentar}=useConsultaRemota(consultarHistorial,solicitud,{conservarDatos:true})
  function cambiar(e){setFormulario(f=>({...f,[e.target.name]:e.target.value}))}
  function aplicar(e){e.preventDefault();setSeleccion(null);setSolicitud({filtros:{...formulario,busqueda:formulario.busqueda.trim()},pagina:1})}
  function limpiar(){const filtros=iniciales();setFormulario(filtros);setSolicitud({filtros,pagina:1});setSeleccion(null)}
  const columnas=[
    {clave:'codigo',titulo:'Venta',renderizar:v=><div><p className="font-bold">{v.codigo}</p><p className="mt-1 text-xs text-app-secundario">{fecha(v.fecha)}</p><p className="mt-1 text-xs">{v.pedido} · {canales[v.canal]}{v.mesa?` · ${v.mesa}`:''}</p></div>},
    {clave:'cliente',titulo:'Cliente',renderizar:v=><div className="max-w-60 break-words"><p className="font-semibold">{v.cliente.nombre}</p>{v.cliente.telefono&&<p className="mt-1 text-xs text-app-secundario">{v.cliente.telefono}</p>}</div>},
    {clave:'total',titulo:'Importe / estado',renderizar:v=><div className="space-y-2"><p className="whitespace-nowrap font-mono font-bold">{monto(v.total)}</p><Badge variante={v.estado==='anulada'?'peligro':'neutro'}>{estados[v.estado]??'Sin estado'}</Badge>{v.devuelto!=='0.00'&&<p className="text-xs">Devuelto: {monto(v.devuelto)}</p>}</div>},
    {clave:'pagos',titulo:'Pago',renderizar:v=><div className="space-y-1 text-xs">{v.pagos.map((p,i)=><p key={i}>{MEDIOS_REPORTE[p.metodo]??p.metodo}: {monto(p.importe)}</p>)}</div>},
    {clave:'acciones',titulo:'Detalle',renderizar:v=><BotonBase className="border border-app-borde" aria-label={`Ver venta ${v.codigo}`} onClick={()=>setSeleccion(v.id)}>Ver detalle</BotonBase>}
  ]
  return <section className="vz-page space-y-6" aria-labelledby="titulo-historial-ventas">
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="lista"/>La Veneziana · Historial comercial</p><h1 id="titulo-historial-ventas" className="vz-page-title">Historial de ventas</h1><p className="vz-page-description">Revisa qué compró cada cliente, cuánto pagó y cómo fue atendido.</p></div><BotonBase className="border border-app-borde" disabled={pendiente} onClick={reintentar}><Icono nombre="actualizar"/>Actualizar historial</BotonBase></header>
    <form onSubmit={aplicar} className="vz-panel grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Filtros de ventas">
      <label className="text-sm font-semibold">Desde<input required type="date" name="desde" value={formulario.desde} onChange={cambiar} className={campo}/></label>
      <label className="text-sm font-semibold">Hasta<input required type="date" name="hasta" value={formulario.hasta} min={formulario.desde} onChange={cambiar} className={campo}/></label>
      <label className="text-sm font-semibold">Cliente o venta<input type="search" name="busqueda" value={formulario.busqueda} maxLength={150} onChange={cambiar} className={campo} placeholder="Nombre, documento, teléfono, ticket o pedido"/></label>
      <label className="text-sm font-semibold">Estado<select aria-label="Estado" name="estado" value={formulario.estado} onChange={cambiar} className={campo}><option value="todos">Todos los estados</option>{Object.entries(estados).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-sm font-semibold">Tipo de atención<select aria-label="Tipo de atención" name="canal" value={formulario.canal} onChange={cambiar} className={campo}><option value="todos">Todos</option>{Object.entries(canales).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-sm font-semibold">Medio de pago<select aria-label="Medio de pago" name="medio" value={formulario.medio} onChange={cambiar} className={campo}><option value="todos">Todos</option>{Object.entries(MEDIOS_REPORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3"><BotonSecundario type="submit" disabled={pendiente}>Aplicar filtros</BotonSecundario><BotonBase className="border border-app-borde" onClick={limpiar}>Limpiar filtros</BotonBase></div>
    </form>
    {datos&&<><p className="text-sm text-app-secundario">Mostrando del {datos.filtros.desde} al {datos.filtros.hasta} · Hora de Lima. Los importes corresponden a todos los resultados del filtro.</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={pendiente}><TarjetaResumen titulo="Operaciones" valor={datos.resumen.cantidad} detalle="Incluye los estados seleccionados" icono="lista"/><TarjetaResumen titulo="Ventas vigentes" valor={monto(datos.resumen.total)} detalle="Excluye las anuladas" icono="billete"/><TarjetaResumen titulo="Devuelto" valor={monto(datos.resumen.devuelto)} detalle="De las ventas vigentes del filtro" icono="billete" tono="rojo"/><TarjetaResumen titulo="Neto" valor={monto(datos.resumen.neto)} detalle="Ventas vigentes menos devoluciones" icono="billete" tono="lima"/></div></>}
    <DataTable titulo="Compras realizadas por clientes" columnas={columnas} filas={datos?.ventas??[]} cargando={pendiente} error={error} alineacionVertical="centro" mensajeVacio="No hay ventas con los filtros seleccionados."/>
    {error&&<BotonBase onClick={reintentar} className="border border-app-borde">Reintentar historial</BotonBase>}
    <PaginacionClientes nombre="Paginación de ventas" datos={datos?.paginacion} pendiente={pendiente} pagina={solicitud.pagina} onPagina={pagina=>setSolicitud(s=>({...s,pagina}))}/>
    {seleccion&&<DetalleVenta key={seleccion} id={seleccion} onCerrar={()=>setSeleccion(null)}/>}
  </section>
}
