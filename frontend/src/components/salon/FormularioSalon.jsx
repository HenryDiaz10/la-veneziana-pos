import {useRef,useState} from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import {guardarConfiguracionSalon} from '../../services/salon.service.js'

export default function FormularioSalon({tipo,registro,zonaId,zonas,onCerrar,onGuardado}) {
  const mesa=tipo==='mesa',eliminar=tipo==='eliminar-zona'
  const [pendiente,setPendiente]=useState(false),[fijada,setFijada]=useState(false),[error,setError]=useState('')
  const [posicion,setPosicion]=useState(registro?.posicion_x!=null&&registro?.posicion_y!=null)
  const intento=useRef(null),enCurso=useRef(false)
  async function guardar(e){
    e.preventDefault();if(enCurso.current)return
    if(!intento.current){
      const f=new FormData(e.currentTarget)
      const datos=eliminar?{revision:registro.revision}:mesa?{
        zona_id:Number(f.get('zona_id')),codigo_mesa:f.get('codigo_mesa').trim(),capacidad_sillas:Number(f.get('capacidad_sillas')),
        habilitada:f.get('habilitada')==='true',posicion_x:posicion?Number(f.get('posicion_x')):null,posicion_y:posicion?Number(f.get('posicion_y')):null,
        ...(registro?{revision:registro.revision}:{})
      }:{nombre:f.get('nombre').trim(),aforo_maximo:Number(f.get('aforo_maximo')),...(registro?{revision:registro.revision}:{})}
      intento.current={tipo,registro,datos,clave:crypto.randomUUID()}
    }
    enCurso.current=true;setPendiente(true);setFijada(true);setError('')
    try{const r=await guardarConfiguracionSalon(intento.current);onGuardado(r)}
    catch(e){setError(e.message);if(e.estado>=400&&e.estado<500){intento.current=null;setFijada(false)}}
    finally{enCurso.current=false;setPendiente(false)}
  }
  return <Modal titulo={eliminar?`Eliminar zona ${registro.nombre}`:mesa?registro?'Editar mesa':'Nueva mesa':registro?'Editar zona':'Nueva zona'} onCerrar={onCerrar} bloqueado={pendiente||fijada}>
    <form onSubmit={guardar} className="space-y-5">
      {error&&<p role="alert" className="rounded-xl border border-app-borde p-4 text-sm text-app-error">{error}{fijada?' Reintenta con los mismos datos; la operación conserva su clave para no duplicarse.':''}</p>}
      <fieldset disabled={pendiente||fijada} className="space-y-4">
        {eliminar?<p>Se eliminará únicamente esta zona vacía. Las zonas que contienen mesas no se pueden eliminar.</p>:mesa?<>
          <label className="vz-config-label">Zona<select aria-label="Zona" name="zona_id" className="vz-config-input" defaultValue={registro?.zona_id??zonaId??zonas[0]?.id} required>{zonas.map(z=><option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="vz-config-label">Código de mesa<input name="codigo_mesa" defaultValue={registro?.codigo_mesa??''} className="vz-config-input" required pattern="[A-Za-z0-9][A-Za-z0-9-]{0,9}" maxLength={10} placeholder="Ej. M01" autoComplete="off"/></label><label className="vz-config-label">Número de sillas<input name="capacidad_sillas" defaultValue={registro?.capacidad_sillas??4} className="vz-config-input" type="number" min="1" max="50" step="1" required/></label></div>
          <label className="vz-config-label">Disponibilidad<select aria-label="Disponibilidad" name="habilitada" className="vz-config-input" defaultValue={registro?.estado_actual==='inhabilitada'?'false':'true'}><option value="true">Habilitada · libre</option><option value="false">Inhabilitada · fuera de servicio</option></select></label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={posicion} onChange={e=>setPosicion(e.target.checked)}/>Definir ubicación en el croquis</label>
          {posicion&&<div className="grid gap-4 sm:grid-cols-2"><label className="vz-config-label">Ubicación horizontal<input name="posicion_x" className="vz-config-input" type="number" min="0" max="10000" step="1" defaultValue={registro?.posicion_x??0} required/></label><label className="vz-config-label">Ubicación vertical<input name="posicion_y" className="vz-config-input" type="number" min="0" max="10000" step="1" defaultValue={registro?.posicion_y??0} required/></label></div>}
          <p className="text-xs leading-relaxed text-app-secundario">El código es único en todo el restaurante. Si no defines ubicación o las mesas quedan superpuestas, se muestra una cuadrícula. Las mesas ocupadas, por limpiar o con cuenta activa deben completar su atención antes de configurarse.</p>
        </>:<>
          <label className="vz-config-label">Nombre de la zona<input name="nombre" className="vz-config-input" defaultValue={registro?.nombre??''} required minLength={2} maxLength={50} placeholder="Ej. Salón principal o Terraza"/></label>
          <label className="vz-config-label">Aforo máximo<input name="aforo_maximo" className="vz-config-input" type="number" min="0" max="10000" step="1" defaultValue={registro?.aforo_maximo??0} required/></label>
          <p className="text-xs leading-relaxed text-app-secundario">0 significa sin aforo definido. Si indicas un aforo, la suma de sillas de sus mesas no debe superarlo, incluidas las mesas inhabilitadas.</p>
        </>}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3"><BotonBase onClick={onCerrar} disabled={pendiente||fijada} className="border border-app-borde">Cancelar</BotonBase><BotonBase type="submit" disabled={pendiente} className="bg-marca-dorado text-texto">{pendiente?'Guardando…':fijada?'Reintentar operación':eliminar?'Eliminar zona':'Guardar configuración'}</BotonBase></div>
    </form>
  </Modal>
}
