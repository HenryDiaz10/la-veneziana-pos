import { useRef,useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import Icono from '../ui/Icono.jsx'
import SelectorCompra from './SelectorCompra.jsx'
import { guardarCompra } from '../../services/compras.service.js'
import { resumenCompra,hoyCompra,escalarCompra } from '../../utils/compras.js'
import { useAuthStore } from '../../stores/auth.store.js'
export default function FormularioCompra({registro,onCerrar,onGuardado}) {
  const uid=useRef(`compra:${crypto.randomUUID()}`),ocupado=useRef(false),comprobar=useAuthStore(s=>s.comprobarSesion)
  const[proveedor,setProveedor]=useState(registro?.proveedor??null),[selector,setSelector]=useState(null)
  const[lineas,setLineas]=useState(registro?.lineas??[]),[igv,setIgv]=useState(registro?.igv??'0.00')
  const[pendiente,setPendiente]=useState(false),[error,setError]=useState(''),[sucio,setSucio]=useState(false),[descartar,setDescartar]=useState(false)
  const resumen=resumenCompra(lineas,igv),cerrar=()=>sucio?setDescartar(true):onCerrar()
  function modificar(id,campo,valor){setSucio(true);setLineas(ls=>ls.map(l=>l.insumo_id===id?{...l,[campo]:valor}:l))}
  async function enviar(e){
    e.preventDefault();if(ocupado.current)return
    if(!proveedor||!lineas.length||resumen.error){
      setError(!proveedor?'Elige un proveedor.':!lineas.length?'Añade al menos un insumo.':resumen.error)
      let campo=null
      for(let n=0;n<lineas.length&&!campo;n++){
        try{if(escalarCompra(lineas[n].cantidad_base)<=0n)campo=e.currentTarget.querySelectorAll('input[inputmode="decimal"]')[n*2]}catch{campo=e.currentTarget.querySelectorAll('input[inputmode="decimal"]')[n*2]}
        if(!campo)try{escalarCompra(lineas[n].costo_unitario)}catch{campo=e.currentTarget.querySelectorAll('input[inputmode="decimal"]')[n*2+1]}
      }
      ;(campo??e.currentTarget.querySelector('input'))?.focus();return
    }
    const form=e.currentTarget,captura=new FormData(form)
    const datos={proveedor_id:proveedor.id,numero_factura:captura.get('numero_factura'),fecha_emision:captura.get('fecha_emision'),fecha_vencimiento:captura.get('fecha_vencimiento')||null,igv,
      lineas:lineas.map(({insumo_id,cantidad_base,costo_unitario})=>({insumo_id,cantidad_base,costo_unitario})),...(registro?{revision:registro.revision}:{operacion_uid:uid.current})}
    ocupado.current=true;setPendiente(true);setError('')
    try{onGuardado(await guardarCompra(registro?.id,datos))}catch(err){setError(err.message||'No se pudo guardar.');if(err.estado===401)void comprobar();form.querySelector('input')?.focus()}finally{ocupado.current=false;setPendiente(false)}
  }
  return <Modal titulo={registro?`Editar borrador ${registro.numero_factura}`:'Nueva compra'} descripcion="Guarda el documento y revisa sus líneas antes de confirmar el ingreso a almacén." onCerrar={cerrar} bloqueado={pendiente}>
    {descartar&&<div><p className="mb-5">¿Descartar los cambios de esta compra?</p><div className="flex flex-wrap gap-3"><BotonBase onClick={()=>setDescartar(false)} className="border border-app-borde">Seguir editando</BotonBase><BotonSecundario onClick={onCerrar}>Descartar cambios</BotonSecundario></div></div>}<form hidden={descartar} onSubmit={enviar} onChange={()=>setSucio(true)}>
      <fieldset disabled={pendiente} className="space-y-5">
        <div className="rounded-xl border border-app-borde p-4"><p className="text-xs text-app-secundario">Proveedor</p><p className="mt-2 break-words font-semibold">{proveedor?.razon_social??'Selecciona un proveedor activo'}</p><BotonBase onClick={()=>setSelector('proveedores')} className="mt-3 border border-app-borde">Elegir proveedor</BotonBase></div>
        {selector&&<SelectorCompra tipo={selector} excluir={selector==='insumos'?lineas.map(l=>l.insumo_id):[]} onCerrar={()=>setSelector(null)} onElegir={r=>{setSucio(true);if(selector==='proveedores')setProveedor(r);else setLineas(ls=>[...ls,{insumo_id:r.id,nombre_insumo:r.nombre,unidad:r.unidad.abreviatura,cantidad_base:'',costo_unitario:''}]);setSelector(null)}}/>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold sm:col-span-2">Número de documento<input name="numero_factura" required maxLength={50} defaultValue={registro?.numero_factura??''} placeholder="F001-000123" className="vz-purchase-input mt-2"/></label><label className="text-sm font-semibold">Fecha de emisión<input name="fecha_emision" type="date" required defaultValue={registro?.fecha_emision??hoyCompra()} className="vz-purchase-input mt-2"/></label><label className="text-sm font-semibold">Vencimiento (opcional)<input name="fecha_vencimiento" type="date" defaultValue={registro?.fecha_vencimiento??''} className="vz-purchase-input mt-2"/></label></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-titulo font-bold">Detalle de insumos</h3><BotonBase disabled={lineas.length>=100} onClick={()=>setSelector('insumos')} className="border border-app-borde"><Icono nombre="mas"/>Añadir insumo</BotonBase></div>
        <p className="text-xs leading-relaxed text-app-secundario">Cantidad y costo por unidad base (kg, L o un), hasta 4 decimales. Captura el costo de almacén neto de descuentos, sin IGV recuperable. El IGV del documento se registra por separado.</p>
        {!lineas.length&&<p className="rounded-xl bg-app-fondo p-5 text-sm text-app-secundario">Añade los insumos recibidos. Si todavía no existen, regístralos desde Compras antes de crear el documento.</p>}
        {lineas.map((l,n)=><div key={l.insumo_id} className="vz-purchase-line"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-semibold">{l.nombre_insumo}</h4><p className="mt-1 text-xs text-app-secundario">Unidad base: {l.unidad}</p></div><BotonBase aria-label={`Retirar ${l.nombre_insumo}`} onClick={()=>{setSucio(true);setLineas(ls=>ls.filter(f=>f.insumo_id!==l.insumo_id))}} className="border border-app-borde"><Icono nombre="eliminar"/></BotonBase></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Cantidad ({l.unidad})<span className="sr-only"> de {l.nombre_insumo}</span><input inputMode="decimal" required maxLength={18} value={l.cantidad_base} onChange={e=>modificar(l.insumo_id,'cantidad_base',e.target.value)} className="vz-purchase-input mt-2"/></label><label className="text-sm">Costo unitario (S/)<span className="sr-only"> de {l.nombre_insumo}</span><input inputMode="decimal" required maxLength={18} value={l.costo_unitario} onChange={e=>modificar(l.insumo_id,'costo_unitario',e.target.value)} className="vz-purchase-input mt-2"/></label></div><p className="mt-3 text-right text-sm font-semibold">Subtotal: S/ {resumen.subtotales?.[n]??'—'}</p></div>)}
        <label className="block text-sm font-semibold">IGV del documento (importe S/)<input inputMode="decimal" required maxLength={13} value={igv} onChange={e=>setIgv(e.target.value)} className="vz-purchase-input mt-2"/></label>
        <div className="rounded-xl bg-app-fondo p-5 text-sm"><p>Subtotal: S/ {resumen.subtotal??'—'}</p><p className="mt-2">IGV: S/ {resumen.igv??'—'}</p><p className="mt-3 text-lg font-bold">Total: S/ {resumen.total??'—'}</p><p className="mt-3 text-xs text-app-secundario">El borrador no ingresa stock. Los importes definitivos se calculan en el servidor.</p></div>
      </fieldset>{error&&<p role="alert" className="mt-4 text-sm text-app-error">{error}</p>}<div className="mt-6 flex flex-wrap justify-end gap-3"><BotonBase onClick={cerrar} disabled={pendiente} className="border border-app-borde">Cancelar</BotonBase><BotonSecundario type="submit" disabled={pendiente}>{pendiente?'Guardando…':'Guardar borrador'}</BotonSecundario></div>
    </form>
  </Modal>
}
