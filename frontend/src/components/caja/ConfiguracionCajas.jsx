import {useRef,useState} from 'react'
import {solicitarApi} from '../../services/api.js'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import Icono from '../ui/Icono.jsx'
import '../../styles/cajas-configuracion.css'
const SOLICITUD={}
const consultar=(_,signal)=>solicitarApi('/caja/configuracion',{signal})
// Configurar la terminal no abre un turno ni modifica cierres históricos.
export default function ConfiguracionCajas({onActualizado}) {
  const [visible,setVisible]=useState(false),[editor,setEditor]=useState(null),[aviso,setAviso]=useState('')
  const consulta=useConsultaRemota(consultar,visible?SOLICITUD:null,{conservarDatos:true})
  return <section className="vz-panel mb-5 space-y-4" aria-labelledby="titulo-config-cajas">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="titulo-config-cajas" className="font-titulo text-lg font-bold">Administración de cajas</h2><p className="mt-1 text-sm text-app-secundario">Crea terminales y asigna quién puede abrir cada una.</p></div><BotonBase className="border border-app-borde" onClick={()=>setVisible(v=>!v)} aria-expanded={visible}><Icono nombre="billete"/>{visible?'Ocultar configuración':'Administrar cajas'}</BotonBase></div>
    {visible&&<>
      <div className="flex flex-wrap gap-3"><BotonBase className="bg-marca-dorado text-texto" disabled={consulta.pendiente||!consulta.datos} onClick={()=>setEditor({caja:null})}><Icono nombre="mas"/>Crear caja</BotonBase><BotonBase disabled={consulta.pendiente} onClick={consulta.reintentar}>Actualizar configuración</BotonBase></div>
      {aviso&&<p role="status">{aviso}</p>}{consulta.error&&<p role="alert" className="text-app-error">{consulta.error}</p>}{consulta.pendiente&&<p role="status">Consultando cajas…</p>}
      {consulta.datos&&<><p className="text-xs text-app-secundario">El responsable debe estar activo y tener permisos de caja y cobro. Si no aparece, revisa su perfil en Mis trabajadores. Sin responsable no se podrá abrir la caja.</p>
        <div className="vz-terminal-grid">{consulta.datos.cajas.map(c=><article key={c.id} className="vz-terminal-card"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold break-words">{c.nombre_terminal}</h3><span className="text-xs">{c.estado==='activa'?'Activa':'En mantenimiento'}</span></div><p className="mt-3 text-sm">Responsable: <strong>{c.cajero?.nombre??'Sin asignar'}</strong></p>{c.cajero&&!c.cajero.habilitado&&<p className="mt-2 text-xs text-app-error">El responsable ya no está habilitado. Asigna otro cajero.</p>}{c.ip_maquina&&<p className="mt-2 text-xs text-app-secundario">IP: {c.ip_maquina}</p>}<p className="my-3 text-xs text-app-secundario">{c.sesion_abierta?`Turno #${c.sesion_abierta.id} abierto. Cierra el turno antes de editar.`:'Sin turno abierto.'}</p><BotonBase aria-label={`Configurar ${c.nombre_terminal}`} disabled={consulta.pendiente||Boolean(c.sesion_abierta)} className="border border-app-borde" onClick={()=>setEditor({caja:c})}>Configurar</BotonBase></article>)}</div>
        {!consulta.datos.cajas.length&&<p>No hay cajas creadas. Crea la primera y asígnale un cajero.</p>}{!consulta.datos.cajeros.length&&<p className="text-sm text-app-error">No hay trabajadores habilitados para caja y cobro. Puedes crear una terminal sin responsable y asignarlo después.</p>}
      </>}
    </>}
    {editor&&<FormularioCaja caja={editor.caja} cajeros={consulta.datos?.cajeros??[]} onCerrar={()=>setEditor(null)} onGuardado={()=>{setEditor(null);setAviso('Configuración de caja guardada.');consulta.reintentar();onActualizado()}}/>}
  </section>
}
function FormularioCaja({caja,cajeros,onCerrar,onGuardado}) {
  const [error,setError]=useState(''),[pendiente,setPendiente]=useState(false),[fijada,setFijada]=useState(false)
  const operacion=useRef(null),ocupado=useRef(false)
  async function enviar(e){
    e.preventDefault();if(ocupado.current)return
    if(!operacion.current){const f=new FormData(e.currentTarget);operacion.current={clave:crypto.randomUUID(),datos:{nombre_terminal:String(f.get('nombre_terminal')).trim(),ip_maquina:String(f.get('ip_maquina')).trim()||null,estado:String(f.get('estado')),cajero_asignado_id:f.get('cajero')?Number(f.get('cajero')):null,...(caja?{version_config:caja.version_config}:{})}}}
    ocupado.current=true;setPendiente(true);setFijada(true);setError('')
    try{await solicitarApi('/caja/configuracion'+(caja?`/${caja.id}`:''),{metodo:caja?'PATCH':'POST',datos:operacion.current.datos,claveIdempotencia:operacion.current.clave});operacion.current=null;onGuardado()}
    catch(e){setError(e.message);if(e.estado>=400&&e.estado<500){operacion.current=null;setFijada(false)}}finally{ocupado.current=false;setPendiente(false)}
  }
  const ausente=caja?.cajero_asignado_id&&!cajeros.some(c=>c.id===caja.cajero_asignado_id)
  return <Modal titulo={caja?'Configurar caja':'Crear caja'} onCerrar={onCerrar} bloqueado={pendiente||fijada}><form onSubmit={enviar} className="space-y-4">
    {error&&<p role="alert" className="text-app-error">{error}{fijada?' Reintenta la misma operación para confirmar su resultado.':''}</p>}
    <fieldset disabled={pendiente||fijada} className="space-y-4">
      <label className="block text-sm font-semibold">Nombre de caja<input name="nombre_terminal" className="vz-purchase-input mt-2 w-full" defaultValue={caja?.nombre_terminal??''} required minLength={2} maxLength={50} placeholder="Ej. Caja principal"/></label>
      <label className="block text-sm font-semibold">Cajero asignado<select aria-label="Cajero asignado" name="cajero" className="vz-purchase-input mt-2 w-full" defaultValue={caja?.cajero_asignado_id??''}><option value="">Sin asignar</option>{ausente&&<option value={caja.cajero_asignado_id} disabled>{caja.cajero?.nombre??'Responsable anterior'} (no habilitado)</option>}{cajeros.map(c=><option key={c.id} value={c.id}>{c.nombre} · {c.perfil}{c.usuario?` · @${c.usuario}`:''}</option>)}</select></label>
      <label className="block text-sm font-semibold">Estado de caja<select aria-label="Estado de caja" name="estado" className="vz-purchase-input mt-2 w-full" defaultValue={caja?.estado??'activa'}><option value="activa">Activa</option><option value="mantenimiento">Mantenimiento</option></select></label>
      <label className="block text-sm font-semibold">IP del equipo (opcional)<input name="ip_maquina" className="vz-purchase-input mt-2 w-full" maxLength={45} defaultValue={caja?.ip_maquina??''} placeholder="Ej. 192.168.1.20"/></label>
      <p className="text-xs text-app-secundario">Asignar una caja no abre un turno. El cajero deberá iniciar sesión y confirmar la apertura con su fondo inicial. La IP es informativa; no restringe el acceso por equipo.</p>
    </fieldset><div className="flex flex-wrap justify-end gap-3"><BotonBase onClick={onCerrar} disabled={pendiente||fijada}>Cancelar</BotonBase><BotonBase type="submit" className="bg-marca-dorado text-texto" disabled={pendiente}>{pendiente?'Guardando…':fijada?'Reintentar operación':caja?'Guardar caja':'Crear caja'}</BotonBase></div>
  </form></Modal>
}
