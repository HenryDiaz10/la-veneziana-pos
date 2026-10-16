import { useMemo,useRef,useState } from 'react'
import { Link } from 'react-router-dom'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarCompra,confirmarCompra,compensarCompra,autorizarCompensacion } from '../../services/compras.service.js'
import { useAuthStore } from '../../stores/auth.store.js'
import Modal from '../ui/Modal.jsx'
import Badge from '../ui/Badge.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import DataTable from '../ui/DataTable.jsx'
import { cantidad } from '../inventario/presentacion.js'
export default function DetalleCompra({id,onCerrar,onEditar,onCambio,onAbrir}) {
  const[revision,setRevision]=useState(0),[accion,setAccion]=useState(null),[pendiente,setPendiente]=useState(false),[error,setError]=useState('')
  const[documento,setDocumento]=useState(''),[motivo,setMotivo]=useState(''),ocupado=useRef(false),aprobacion=useRef(null)
  const usuario=useAuthStore(s=>s.usuario),comprobar=useAuthStore(s=>s.comprobarSesion)
  const solicitud=useMemo(()=>({id,revision}),[id,revision]),consulta=useConsultaRemota(consultarCompra,solicitud),c=consulta.datos?.compra
  const puedeAprobar=usuario?.permisos.some(p=>p.modulo==='seguridad'&&p.accion==='gestionar')
  async function ejecutar(e) {
    e?.preventDefault();if(ocupado.current)return
    ocupado.current=true;setPendiente(true);setError('')
    try {
      if(accion==='confirmar'){await confirmarCompra(id,c.revision);setRevision(r=>r+1);setAccion(null);onCambio()}
      else {
        const clave=JSON.stringify([documento.trim().toUpperCase(),motivo.trim(),c.revision])
        if(aprobacion.current?.clave!==clave){const r=await autorizarCompensacion(id,usuario.id,motivo.trim());aprobacion.current={clave,id:r.autorizacion.id}}
        const r=await compensarCompra(id,{documento:documento.trim(),motivo:motivo.trim(),revision:c.revision,autorizacion_id:aprobacion.current.id})
        onCambio();onAbrir(r.compra.id)
      }
    }catch(err){setError(err.message||'No se pudo completar.');if(err.estado===403)aprobacion.current=null;if(err.estado===401)void comprobar()}
    finally{ocupado.current=false;setPendiente(false)}
  }
  const columnas=[{clave:'nombre_insumo',titulo:'Insumo',renderizar:l=><Link className="font-semibold underline" to={`/inventario?insumo=${l.insumo_id}`}>{l.nombre_insumo}</Link>},
    {clave:'cantidad_base',titulo:'Cantidad',numerica:true,alineacion:'derecha',renderizar:l=>`${cantidad(l.cantidad_base)} ${l.unidad}`},
    {clave:'costo_unitario',titulo:'Costo unitario (S/)',numerica:true,alineacion:'derecha',renderizar:l=>cantidad(l.costo_unitario)},
    {clave:'subtotal',titulo:'Subtotal (S/)',numerica:true,alineacion:'derecha'}]
  return <Modal titulo={c?`${c.tipo_documento==='compensacion'?'Compensación':'Compra'} ${c.numero_factura}`:'Detalle de compra'} onCerrar={onCerrar} bloqueado={pendiente}>
    {consulta.pendiente?<p role="status">Consultando documento…</p>:consulta.error?<div role="alert"><p className="mb-4 text-app-error">{consulta.error}</p><BotonBase onClick={()=>setRevision(r=>r+1)} className="border border-app-borde">Reintentar compra</BotonBase></div>:c&&<>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Badge variante={c.estado_registro==='borrador'?'advertencia':c.estado_registro==='confirmada'?'exito':'neutro'}>{c.estado_registro}</Badge><BotonBase disabled={pendiente} onClick={()=>{setAccion(null);setRevision(r=>r+1)}} className="border border-app-borde">Actualizar documento</BotonBase></div>
      <p className="break-words font-semibold">{c.proveedor.razon_social}</p><p className="mt-2 text-sm text-app-secundario">RUC {c.proveedor.ruc}</p><p className="mt-2 text-sm text-app-secundario">Emisión: {c.fecha_emision}{c.fecha_vencimiento?` · Vence: ${c.fecha_vencimiento}`:''}</p>
      {c.compra_origen_id&&<p className="mt-4 rounded-xl bg-app-fondo p-4 text-sm">Documento compensatorio de la compra #{c.compra_origen_id}. <button type="button" onClick={()=>onAbrir(c.compra_origen_id)} className="font-semibold underline">Ver compra original</button></p>}
      {c.compensacion_id&&<p className="mt-4 rounded-xl bg-app-fondo p-4 text-sm">Esta compra fue compensada. <button type="button" onClick={()=>onAbrir(c.compensacion_id)} className="font-semibold underline">Ver documento compensatorio</button></p>}
      <div className="mt-5"><DataTable titulo="Detalle del documento" columnas={columnas} filas={c.lineas} obtenerClave={l=>l.insumo_id}/></div>
      <dl className="my-5 rounded-xl bg-app-fondo p-5 text-sm"><div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>S/ {c.subtotal}</dd></div><div className="mt-2 flex justify-between gap-3"><dt>IGV</dt><dd>S/ {c.igv}</dd></div><div className="mt-4 flex justify-between gap-3 text-lg font-bold"><dt>Total</dt><dd>S/ {c.total}</dd></div></dl>
      <p className="text-xs leading-relaxed text-app-secundario">{c.tipo_documento==='compensacion'?'La compensación retira las cantidades completas con costo promedio vigente. Conserva los importes documentales de la compra original.':c.estado_registro==='borrador'?'Este borrador no ha ingresado existencias.':`Movimientos de almacén registrados: ${c.movimientos.length}. Las líneas históricas se conservan.`} Esta pantalla no registra pagos al proveedor.</p>
      {!accion&&<div className="mt-6 flex flex-wrap gap-3">{c.estado_registro==='borrador'&&<><BotonBase onClick={()=>onEditar(c)} className="border border-app-borde">Editar borrador</BotonBase><BotonSecundario onClick={()=>setAccion('confirmar')}>Confirmar ingreso</BotonSecundario></>}{c.estado_registro==='confirmada'&&puedeAprobar&&<BotonBase onClick={()=>setAccion('compensar')} className="border border-app-borde text-app-error">Compensar compra completa</BotonBase>}</div>}
      {accion==='confirmar'&&<div className="mt-5 rounded-xl border border-app-borde p-5"><p className="mb-4 text-sm">Se ingresarán todas las líneas a almacén y se actualizará el costo promedio. El documento quedará cerrado para edición.</p><div className="flex flex-wrap gap-3"><BotonBase disabled={pendiente} onClick={()=>setAccion(null)} className="border border-app-borde">Volver</BotonBase><BotonSecundario disabled={pendiente} onClick={ejecutar}>{pendiente?'Confirmando…':'Ingresar al almacén'}</BotonSecundario></div></div>}
      {accion==='compensar'&&<form className="mt-5 space-y-4 rounded-xl border border-app-borde p-5" onSubmit={ejecutar}><p className="text-sm leading-relaxed">Registra el documento de corrección. Se retirará toda la cantidad recibida, siempre que exista disponible sin comprometer reservas. La aprobación administrativa se utilizará una sola vez.</p><fieldset disabled={pendiente} className="space-y-4"><label className="block text-sm font-semibold">Número del documento compensatorio<input value={documento} onChange={e=>setDocumento(e.target.value)} required maxLength={50} className="vz-purchase-input mt-2" placeholder="NC01-000123"/></label><label className="block text-sm font-semibold">Motivo<textarea value={motivo} onChange={e=>setMotivo(e.target.value)} required maxLength={180} className="vz-purchase-input mt-2"/></label></fieldset><div className="flex flex-wrap gap-3"><BotonBase disabled={pendiente} onClick={()=>setAccion(null)} className="border border-app-borde">Cancelar</BotonBase><BotonSecundario type="submit" disabled={pendiente}>{pendiente?'Procesando…':'Autorizar y compensar'}</BotonSecundario></div></form>}
      {error&&<p role="alert" className="mt-5 text-sm text-app-error">{error}</p>}
    </>}
  </Modal>
}
