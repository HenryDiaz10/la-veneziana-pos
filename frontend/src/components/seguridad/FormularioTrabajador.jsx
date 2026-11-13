import {useRef,useState} from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import {guardarTrabajador} from '../../services/trabajadores.service.js'
export default function FormularioTrabajador({accion='datos',registro,roles,uid,onCerrar,onGuardado}){
  const creando=!registro,password=creando||accion==='password',eliminar=accion==='eliminar',propio=registro?.id===uid
  const [perfil,setPerfil]=useState(String(registro?.rol.id??'')),[visible,setVisible]=useState(false),[pendiente,setPendiente]=useState(false),[fijada,setFijada]=useState(false),[error,setError]=useState('')
  const op=useRef(null),enCurso=useRef(false)
  async function enviar(e){
    e.preventDefault();if(enCurso.current)return
    if(!op.current){
      const f=new FormData(e.currentTarget),pwd=String(f.get('password')??'')
      if(password&&(pwd!==f.get('confirmar')||[...pwd].length<12||new TextEncoder().encode(pwd).length>72)){setError('La contraseña debe coincidir, tener al menos 12 caracteres y no superar 72 bytes.');return}
      const datos=eliminar?{revision:registro.revision}:accion==='password'?{password:pwd,revision:registro.revision}:{nombre:String(f.get('nombre')).trim(),usuario:String(f.get('usuario')).trim(),email:String(f.get('email')??'').trim()||null,documento:String(f.get('documento')??'').trim()||null,fecha_contratacion:f.get('fecha_contratacion')||null,rol_id:propio?registro.rol.id:Number(perfil),estado:propio?registro.estado:String(f.get('estado')??'activo'),...(creando?{password:pwd}:{revision:registro.revision})}
      op.current={accion,registro,datos,clave:crypto.randomUUID()}
    }
    enCurso.current=true;setPendiente(true);setFijada(true);setError('')
    try{const r=await guardarTrabajador(op.current);op.current=null;onGuardado(r,accion)}catch(e){setError(e.message);if(e.estado>=400&&e.estado<500){op.current=null;setFijada(false)}}finally{enCurso.current=false;setPendiente(false)}
  }
  const rol=roles.find(r=>String(r.id)===perfil)
  return <Modal titulo={eliminar?'Eliminar cuenta de trabajador':accion==='password'?`Cambiar contraseña · ${registro.nombre}`:creando?'Agregar trabajador':'Editar trabajador'} onCerrar={onCerrar} bloqueado={pendiente||fijada}>
    <form onSubmit={enviar} className="space-y-5" autoComplete="off">
      {error&&<p role="alert" className="vz-worker-alert">{error}{fijada?' Reintenta con la misma operación para evitar duplicados.':''}</p>}
      <fieldset disabled={pendiente||fijada} className="space-y-4">
        {eliminar?<div className="space-y-3"><p>¿Dar de baja a <strong>{registro.nombre}</strong> ({registro.usuario??registro.email})?</p><p className="text-sm text-app-secundario">Perderá el acceso y se cerrarán sus sesiones. Se conservará la autoría de sus pedidos, ventas y otras operaciones. Podrás encontrarlo en «Dados de baja» y reactivarlo si corresponde.</p></div>:<>
          {accion!=='password'&&<>
            <label className="vz-worker-label">Nombres y apellidos<input name="nombre" className="vz-worker-input" required minLength={2} maxLength={150} defaultValue={registro?.nombre??''}/></label>
            <div className="vz-worker-form-grid"><label className="vz-worker-label">Usuario de acceso<input name="usuario" className="vz-worker-input" required minLength={3} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,39}" placeholder="Ej. cocinero01" defaultValue={registro?.usuario??''} autoComplete="off" autoCapitalize="none" spellCheck={false}/></label><label className="vz-worker-label">Correo (opcional)<input name="email" className="vz-worker-input" type="email" maxLength={100} defaultValue={registro?.email??''}/></label></div>
            <div className="vz-worker-form-grid"><label className="vz-worker-label">Documento (opcional)<input name="documento" className="vz-worker-input" maxLength={20} defaultValue={registro?.documento??''}/></label><label className="vz-worker-label">Fecha de contratación<input name="fecha_contratacion" className="vz-worker-input" type="date" defaultValue={registro?.fecha_contratacion??''}/></label></div>
            <div className="vz-worker-form-grid"><label className="vz-worker-label">Tipo de perfil<select aria-label="Tipo de perfil" className="vz-worker-input" required value={perfil} disabled={propio} onChange={e=>setPerfil(e.target.value)}><option value="">Selecciona un perfil</option>{roles.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label><label className="vz-worker-label">Estado<select aria-label="Estado del trabajador" name="estado" className="vz-worker-input" disabled={propio} defaultValue={registro?.estado??'activo'}><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="cesado">Dado de baja</option></select></label></div>
            {rol&&<details className="vz-worker-permisos"><summary>Permisos de {rol.nombre} ({rol.permisos.length})</summary><p className="mt-2 text-xs text-app-secundario">{rol.descripcion}</p><ul>{rol.permisos.map(p=><li key={`${p.modulo}-${p.accion}`}>{p.modulo} · {p.accion}</li>)}</ul></details>}
          </>}
          {password&&<><div className="vz-worker-form-grid"><label className="vz-worker-label">Contraseña<input name="password" className="vz-worker-input" type={visible?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={72}/></label><label className="vz-worker-label">Confirmar contraseña<input name="confirmar" className="vz-worker-input" type={visible?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={72}/></label></div><button type="button" className="text-sm underline" onClick={()=>setVisible(v=>!v)}>{visible?'Ocultar contraseñas':'Mostrar contraseñas'}</button><p className="text-xs text-app-secundario">Mínimo 12 caracteres, máximo 72 bytes. Entrega las credenciales al trabajador por tu canal habitual. La contraseña no se guarda en texto ni se puede consultar después.</p></>}
          {!creando&&<p className="text-xs text-app-secundario">Cambiar usuario, correo, perfil o estado cierra las sesiones del trabajador. Cambiar contraseña también lo hace. Tu propia cuenta conserva su perfil y estado.</p>}
        </>}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3"><BotonBase onClick={onCerrar} disabled={pendiente||fijada} className="border border-app-borde">Cancelar</BotonBase><BotonBase type="submit" disabled={pendiente} className={eliminar?'border border-app-error text-app-error':'bg-marca-dorado text-texto'}>{pendiente?'Guardando…':fijada?'Reintentar operación':eliminar?'Eliminar cuenta':accion==='password'?'Cambiar contraseña':creando?'Crear trabajador':'Guardar cambios'}</BotonBase></div>
    </form>
  </Modal>
}
