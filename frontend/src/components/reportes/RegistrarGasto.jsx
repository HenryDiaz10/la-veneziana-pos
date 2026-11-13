import {useMemo,useRef,useState} from 'react'
import {useAuthStore} from '../../stores/auth.store.js'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import {consultarCategoriasReporte} from '../../services/reportes.service.js'
import {solicitarApi} from '../../services/api.js'
import {CLASES_REPORTE,filtrosInicialesReporte} from '../../utils/reportes.js'
import BotonBase from '../ui/BotonBase.jsx'
import Modal from '../ui/Modal.jsx'

export default function RegistrarGasto({uid,onGuardado,compacto=false}) {
  const usuario=useAuthStore(s=>s.usuario),[abierto,setAbierto]=useState(false)
  const [bloqueado,setBloqueado]=useState(false)
  if(!usuario?.permisos.some(p=>p.modulo==='configuracion'&&p.accion==='gestionar'))return null
  if(compacto)return <><BotonBase className="bg-marca-dorado text-texto" onClick={()=>setAbierto(true)}>Registrar gasto</BotonBase>{abierto&&<Modal titulo="Registrar gasto o categoría" bloqueado={bloqueado} onCerrar={()=>setAbierto(false)}><Formulario uid={uid} onGuardado={onGuardado} onBloqueo={setBloqueado}/></Modal>}</>
  return <section className="vz-report-panel vz-no-print"><header><div><h2>Registrar gastos del periodo</h2><p>Alquiler, servicios, sueldos, intereses y provisiones. No registra pagos ni movimientos de caja.</p></div><BotonBase onClick={()=>setAbierto(v=>!v)}>{abierto?'Ocultar formulario':'Nuevo gasto / categoría'}</BotonBase></header>{abierto&&<Formulario uid={uid} onGuardado={onGuardado}/>}</section>
}
function Formulario({uid,onGuardado,onBloqueo}) {
  const [revision,setRevision]=useState(0),[pendiente,setPendiente]=useState(false),[error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[fijada,setFijada]=useState(false)
  const solicitud=useMemo(()=>({uid,revision}),[uid,revision]),categorias=useConsultaRemota(consultarCategoriasReporte,solicitud)
  const operacion=useRef(null),enCurso=useRef(false),form=useRef(null)
  async function enviar(e){
    e.preventDefault();if(enCurso.current)return
    const datos=new FormData(e.currentTarget),categoria=datos.get('nueva_categoria')?.trim()
    if(!operacion.current){
      const cuerpo=categoria?{nombre:categoria,es_deducible_impuestos:false}:{categoria_id:Number(datos.get('categoria_id')),descripcion:datos.get('descripcion').trim(),monto_gasto:datos.get('monto_gasto'),fecha_gasto:datos.get('fecha_gasto'),clasificacion:datos.get('clasificacion'),movimiento_caja_id:datos.get('movimiento_caja_id')?Number(datos.get('movimiento_caja_id')):null,comprobante_fiscal:datos.get('comprobante_fiscal').trim()}
      operacion.current={ruta:categoria?'/reportes/gastos/categorias':'/reportes/gastos',cuerpo,clave:crypto.randomUUID()}
    }
    enCurso.current=true;setPendiente(true);setError('');setFijada(true)
    onBloqueo?.(true)
    try{
      const op=operacion.current
      await solicitarApi(op.ruta,{metodo:'POST',datos:op.cuerpo,claveIdempotencia:op.clave})
      setMensaje(op.ruta.endsWith('/categorias')?'Categoría guardada; ya puedes seleccionarla.':'Gasto registrado. El reporte se actualizó; revisa que su fecha esté en el periodo aplicado.')
      operacion.current=null;setFijada(false);form.current.reset();setRevision(v=>v+1);onGuardado()
      onBloqueo?.(false)
    }catch(e){setError(e.message);if(e.estado>=400&&e.estado<500){operacion.current=null;setFijada(false);onBloqueo?.(false)}}
    finally{enCurso.current=false;setPendiente(false)}
  }
  return <form ref={form} onSubmit={enviar} className="vz-gasto-form">
    <p className="vz-report-nota">Las compras confirmadas ya se incluyen automáticamente en «Compras y otros gastos». Aquí registra otros conceptos, como alquiler o servicios; no vuelvas a cargar una compra ya registrada.</p>
    {error&&<p role="alert" className="vz-report-alerta">{error}{fijada?' Reintenta con los mismos datos; se conserva la clave para evitar duplicados.':''}</p>}{mensaje&&<p role="status">{mensaje}</p>}
    <fieldset disabled={pendiente||fijada}><div className="vz-report-filtros">
      <label>Categoría<select name="categoria_id">{categorias.datos?.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Descripción<input name="descripcion" maxLength={255} placeholder="Ej. Alquiler de noviembre"/></label>
      <label>Monto S/<input name="monto_gasto" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" placeholder="0.00"/></label>
      <label>Fecha del gasto<input name="fecha_gasto" type="date" defaultValue={filtrosInicialesReporte().hasta}/></label>
      <label>Clasificación<select name="clasificacion">{Object.entries(CLASES_REPORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Documento / referencia<input name="comprobante_fiscal" maxLength={50}/></label>
      <label>Egreso existente (ID, opcional)<input name="movimiento_caja_id" inputMode="numeric" pattern="[1-9][0-9]{0,9}" maxLength={10} placeholder="Vincular sin duplicar"/></label>
      <label>Nueva categoría (solo crear categoría)<input name="nueva_categoria" maxLength={100} placeholder="Ej. Servicios o Planilla"/></label>
      <p>Si completas «Nueva categoría», solo se crea esa categoría. Después registra el gasto. La provisión de impuesto debe validarse según tu régimen; no se calcula automáticamente una tasa de renta. Vincula un egreso existente si ese gasto ya salió de caja.</p>
    </div></fieldset>
    <BotonBase type="submit" disabled={pendiente||categorias.pendiente} className="mt-3 border border-app-borde">{pendiente?'Guardando…':fijada?'Reintentar registro':'Guardar gasto / categoría'}</BotonBase>
    {categorias.error&&<p role="alert">{categorias.error}</p>}
  </form>
}
