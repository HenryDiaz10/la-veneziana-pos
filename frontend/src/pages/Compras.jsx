import { useEffect,useState } from 'react'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { listarCompras } from '../services/compras.service.js'
import DataTable from '../components/ui/DataTable.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Badge from '../components/ui/Badge.jsx'
import Icono from '../components/ui/Icono.jsx'
import PaginacionClientes from '../components/clientes/PaginacionClientes.jsx'
import FormularioMaestroCompra from '../components/compras/FormularioMaestroCompra.jsx'
import FormularioCompra from '../components/compras/FormularioCompra.jsx'
import DetalleCompra from '../components/compras/DetalleCompra.jsx'
export default function Compras() {
  const[solicitud,setSolicitud]=useState({vista:'compras',pagina:1,busqueda:'',estado:'todos',revision:0}),[texto,setTexto]=useState('')
  const[formulario,setFormulario]=useState(null),[detalle,setDetalle]=useState(null),[mensaje,setMensaje]=useState('')
  const{datos,error,pendiente}=useConsultaRemota(listarCompras,solicitud),esCompra=solicitud.vista==='compras'
  useEffect(()=>{const t=setTimeout(()=>setSolicitud(s=>s.busqueda===texto.trim()?s:{...s,busqueda:texto.trim(),pagina:1}),300);return()=>clearTimeout(t)},[texto])
  const actualizar=()=>setSolicitud(s=>({...s,revision:s.revision+1}))
  function guardado(r){setFormulario(null);setMensaje(r.compra?'Borrador guardado. Revisa el documento antes de confirmar.':r.proveedor?'Proveedor guardado.':'Insumo registrado con saldo cero. Ya puedes añadirlo a una compra.');actualizar();if(r.compra)setDetalle(r.compra.id)}
  const columnas=esCompra?[
    {clave:'numero_factura',titulo:'Documento',renderizar:c=><div><strong>{c.numero_factura}</strong><p className="mt-1 text-xs text-app-secundario">{c.tipo_documento==='compensacion'?'Compensación':'Compra'} · {c.fecha_emision}</p></div>},
    {clave:'razon_social',titulo:'Proveedor'},{clave:'estado_registro',titulo:'Registro',renderizar:c=><Badge variante={c.estado_registro==='borrador'?'advertencia':c.estado_registro==='confirmada'?'exito':'neutro'}>{c.estado_registro}</Badge>},
    {clave:'total',titulo:'Total (S/)',numerica:true,alineacion:'derecha'},{clave:'detalle',titulo:'Consulta',renderizar:c=><BotonBase className="vz-row-action" aria-label={`Ver compra ${c.numero_factura}`} onClick={()=>setDetalle(c.id)}>Ver documento</BotonBase>}
  ]:[{clave:'razon_social',titulo:'Razón social'},{clave:'ruc',titulo:'RUC'},{clave:'telefono_contacto',titulo:'Teléfono'},{clave:'estado',titulo:'Estado',renderizar:p=><Badge variante={p.estado==='activo'?'exito':'neutro'}>{p.estado}</Badge>},
    {clave:'editar',titulo:'Acciones',renderizar:p=><BotonBase className="vz-row-action" aria-label={`Editar proveedor ${p.razon_social}`} onClick={()=>setFormulario({tipo:'proveedor',registro:p})}>Editar</BotonBase>}]
  return <section className="vz-page" aria-labelledby="titulo-compras">
    <div className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="compras"/>La Veneziana · Abastecimiento</p><h1 className="vz-page-title" id="titulo-compras">Compras y proveedores</h1><p className="vz-page-description">Del documento al almacén, con cada ingreso registrado.</p></div><div className="flex flex-wrap gap-2"><BotonBase onClick={()=>setFormulario({tipo:'proveedor'})} className="border border-app-borde">Nuevo proveedor</BotonBase><BotonBase onClick={()=>setFormulario({tipo:'insumo'})} className="border border-app-borde">Nuevo insumo</BotonBase><BotonSecundario onClick={()=>setFormulario({tipo:'compra'})}><Icono nombre="mas"/>Nueva compra</BotonSecundario></div></div>
    <div className="vz-panel mb-6"><div className="mb-5 flex flex-wrap gap-3">{[['compras','Compras'],['proveedores','Proveedores']].map(([v,n])=><BotonBase key={v} aria-pressed={solicitud.vista===v} onClick={()=>{setTexto('');setSolicitud(s=>({...s,vista:v,pagina:1,busqueda:''}))}} className={`border border-app-borde ${solicitud.vista===v?'bg-app-hover font-bold':''}`}>{n}</BotonBase>)}</div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto]"><label className="min-w-0 text-sm font-semibold">{esCompra?'Buscar documento':'Buscar proveedor por razón social o RUC'}<input value={texto} onChange={e=>setTexto(e.target.value)} maxLength={150} type="search" className="vz-purchase-input mt-2"/></label>{esCompra?<label className="text-sm font-semibold">Estado del registro<select className="vz-purchase-input mt-2" value={solicitud.estado} onChange={e=>setSolicitud(s=>({...s,estado:e.target.value,pagina:1}))}><option value="todos">Todos</option><option value="borrador">Borrador</option><option value="confirmada">Confirmada</option><option value="compensada">Compensada</option></select></label>:<div/>}<BotonBase disabled={pendiente} onClick={actualizar} className="self-end border border-app-borde"><Icono nombre="actualizar"/>Actualizar</BotonBase></div>
      <p className="mt-4 text-xs text-app-secundario">Los borradores no mueven existencias. Confirma únicamente documentos y cantidades recibidas en almacén.</p>
    </div>
    {mensaje&&<p role="status" className="vz-panel mb-5 text-sm">{mensaje}</p>}
    <DataTable titulo={esCompra?'Documentos de compra':'Proveedores registrados'} columnas={columnas} filas={datos?.[solicitud.vista]??[]} cargando={pendiente} error={error} mensajeVacio={esCompra?'No hay documentos que coincidan. Registra proveedores e insumos para preparar tu primera compra.':'No hay proveedores que coincidan con la búsqueda.'}/>
    {error&&<BotonBase onClick={actualizar} className="mt-3 border border-app-borde">Reintentar listado</BotonBase>}
    <PaginacionClientes nombre="Páginas de compras y proveedores" datos={datos?.paginacion} pagina={solicitud.pagina} pendiente={pendiente} onPagina={pagina=>setSolicitud(s=>({...s,pagina}))}/>
    {formulario?.tipo==='compra'?<FormularioCompra registro={formulario.registro} onCerrar={()=>setFormulario(null)} onGuardado={guardado}/>:formulario&&<FormularioMaestroCompra {...formulario} onCerrar={()=>setFormulario(null)} onGuardado={guardado}/>}
    {detalle&&<DetalleCompra key={detalle} id={detalle} onCerrar={()=>setDetalle(null)} onAbrir={setDetalle} onCambio={actualizar} onEditar={c=>{setDetalle(null);setFormulario({tipo:'compra',registro:c})}}/>}
  </section>
}
