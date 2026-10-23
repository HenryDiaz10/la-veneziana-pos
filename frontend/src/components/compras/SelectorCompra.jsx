import { useMemo,useState } from 'react'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { buscarRecursoCompra } from '../../services/compras.service.js'
import BotonBase from '../ui/BotonBase.jsx'
import PaginacionClientes from '../clientes/PaginacionClientes.jsx'
export default function SelectorCompra({tipo,onElegir,onCerrar,excluir=[]}) {
  const[texto,setTexto]=useState(''),[pagina,setPagina]=useState(1),[busqueda,setBusqueda]=useState(''),[revision,setRevision]=useState(0)
  const solicitud=useMemo(()=>({tipo,pagina,busqueda,revision}),[tipo,pagina,busqueda,revision])
  const{datos,error,pendiente}=useConsultaRemota(buscarRecursoCompra,solicitud,{conservarDatos:true,claveDatos:tipo})
  return <section className="vz-purchase-picker" aria-label={`Seleccionar ${tipo}`}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Elegir {tipo==='proveedores'?'proveedor':'insumo'}</h3><BotonBase onClick={onCerrar} className="border border-app-borde">Cerrar selector</BotonBase></div>
    <div className="flex gap-2"><input aria-label={`Buscar ${tipo}`} className="vz-purchase-input" value={texto} maxLength={150} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setPagina(1);setBusqueda(texto.trim());setRevision(r=>r+1)}}}/><BotonBase onClick={()=>{setPagina(1);setBusqueda(texto.trim());setRevision(r=>r+1)}} className="border border-app-borde">Buscar</BotonBase></div>
    {pendiente&&datos&&<p role="status" className="sr-only">Actualizando resultados…</p>}
    {pendiente&&!datos?<p role="status" className="mt-3 text-sm">Consultando…</p>:error?<div role="alert" className="mt-3"><p className="text-sm text-app-error">{error}</p><BotonBase onClick={()=>setRevision(r=>r+1)}>Reintentar</BotonBase></div>:<ul aria-busy={pendiente} inert={pendiente||undefined} className="mt-3 space-y-2">{(datos?.[tipo]??[]).map(r=>{
      const disabled=excluir.includes(r.id)||(tipo==='proveedores'?r.estado!=='activo':!r.activo||!r.unidades_compatibles?.length)
      return <li key={r.id}><button type="button" disabled={disabled} onClick={()=>onElegir(r)} className="vz-purchase-pick"><strong>{r.razon_social??r.nombre}</strong><span className="text-xs text-app-secundario">{r.ruc??`${r.codigo??'Sin código'} · ${r.unidad?.abreviatura??'Sin unidad'}`}{disabled?' · No disponible o agregado':''}</span></button></li>
    })}{datos?.[tipo]?.length===0&&<li className="py-4 text-sm text-app-secundario">Sin coincidencias. Registra el {tipo==='proveedores'?'proveedor':'insumo'} desde Compras antes de crear el documento.</li>}</ul>}
    <PaginacionClientes nombre={`Páginas de ${tipo}`} datos={datos?.paginacion} pagina={pagina} pendiente={pendiente} onPagina={setPagina}/>
  </section>
}
