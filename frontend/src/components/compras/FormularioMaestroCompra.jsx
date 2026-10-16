import { useRef,useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import { guardarProveedor,crearInsumo } from '../../services/compras.service.js'
import { useAuthStore } from '../../stores/auth.store.js'
export default function FormularioMaestroCompra({tipo,registro,onCerrar,onGuardado}) {
  const proveedor=tipo==='proveedor',ocupado=useRef(false)
  const[pendiente,setPendiente]=useState(false),[error,setError]=useState(''),[sucio,setSucio]=useState(false),[descartar,setDescartar]=useState(false)
  const comprobar=useAuthStore(s=>s.comprobarSesion)
  const campos=proveedor?[['razon_social','Razón social',200,true],['ruc','RUC (11 dígitos)',11,true],['telefono_contacto','Teléfono de contacto',50],['correo_contacto','Correo de contacto',100]]:[['nombre','Nombre del insumo',150,true],['codigo','Código del insumo',50,true],['stock_minimo_alerta','Mínimo de alerta',18,true]]
  async function enviar(e) {
    e.preventDefault();if(ocupado.current)return
    const form=e.currentTarget,datos=Object.fromEntries(new FormData(form))
    if(proveedor)datos.dias_credito=Number(datos.dias_credito)
    ocupado.current=true;setPendiente(true);setError('')
    try {const r=proveedor?await guardarProveedor(registro?.id,datos):await crearInsumo(datos);onGuardado(r)}
    catch(err){setError(err.message||'No se pudo guardar.');if(err.estado===401)void comprobar();form.querySelector('input')?.focus()}
    finally{ocupado.current=false;setPendiente(false)}
  }
  const cerrar=()=>sucio?setDescartar(true):onCerrar()
  return <Modal titulo={`${registro?'Editar':'Nuevo'} ${proveedor?'proveedor':'insumo'}`} onCerrar={cerrar} bloqueado={pendiente}>
    {descartar&&<div><p className="mb-5 text-sm">Hay cambios sin guardar. ¿Quieres descartarlos?</p><div className="flex flex-wrap gap-3"><BotonBase onClick={()=>setDescartar(false)} className="border border-app-borde">Seguir editando</BotonBase><BotonSecundario onClick={onCerrar}>Descartar cambios</BotonSecundario></div></div>}<form hidden={descartar} onSubmit={enviar} onChange={()=>setSucio(true)}>
      <fieldset disabled={pendiente} className="space-y-4">{campos.map(([name,label,max,required])=><label key={name} className="block text-sm font-semibold">{label}<input name={name} required={required} maxLength={max} defaultValue={registro?.[name]??(name==='stock_minimo_alerta'?'0.0000':'')} className="vz-purchase-input mt-2" type={name==='correo_contacto'?'email':'text'} pattern={name==='ruc'?'[0-9]{11}':undefined}/></label>)}
      {proveedor?<><label className="block text-sm font-semibold">Días de crédito<input name="dias_credito" type="number" min="0" max="3650" step="1" defaultValue={registro?.dias_credito??0} className="vz-purchase-input mt-2"/></label><label className="block text-sm font-semibold">Estado<select name="estado" defaultValue={registro?.estado??'activo'} className="vz-purchase-input mt-2"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label></>:<><label className="block text-sm font-semibold">Unidad base<select name="unidad" className="vz-purchase-input mt-2"><option value="kg">Kilogramo (kg)</option><option value="L">Litro (L)</option><option value="un">Unidad (un)</option></select></label><p className="text-xs leading-relaxed text-app-secundario">El insumo se registra con saldo cero. La confirmación de una compra ingresará las existencias.</p></>}
      </fieldset>{error&&<p role="alert" className="mt-4 text-sm text-app-error">{error}</p>}<div className="mt-6 flex flex-wrap justify-end gap-3"><BotonBase onClick={cerrar} disabled={pendiente} className="border border-app-borde">Cancelar</BotonBase><BotonSecundario type="submit" disabled={pendiente}>{pendiente?'Guardando…':'Guardar'}</BotonSecundario></div>
    </form>
  </Modal>
}
