import { useState } from 'react'
import { useAuthStore } from '../../stores/auth.store.js'
import { ejecutarComercial } from '../../stores/comercial.store.js'
import { solicitarApi } from '../../services/api.js'
import { importeEntrada } from '../../utils/pagos-mixtos.js'
import { desdeCentimos } from '../../utils/carrito-calculo.js'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'

export default function ModalMovimientoCaja({ sesionId, bloqueado, onCerrar, onGuardar }) {
  const usuario = useAuthStore(s => s.usuario)
  const [tipo, setTipo] = useState('ingreso'), [monto, setMonto] = useState(''), [concepto, setConcepto] = useState('')
  const [respaldo, setRespaldo] = useState(''), [autorizacion, setAutorizacion] = useState('')
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState(''), [salida, setSalida] = useState(false)
  const aprobar = usuario.permisos.some(p => p.modulo === 'seguridad' && p.accion === 'gestionar')
  const sucio = Boolean(monto || concepto || respaldo || autorizacion)
  const cerrar = () => sucio ? setSalida(true) : onCerrar()
  async function crearAprobacion() {
    setOcupado(true); setError('')
    try {
      const r = await solicitarApi('/autorizaciones', { metodo: 'POST', datos: { actorId: usuario.id, accion: 'caja/egreso', entidad: 'sesiones_caja_z', entidadId: sesionId, motivo: concepto.trim() } })
      if (useAuthStore.getState().usuario?.id === usuario.id) setAutorizacion(r.autorizacion.id)
    } catch (e) { setError(e.message) }
    finally { setOcupado(false) }
  }
  async function guardar(e) {
    e.preventDefault(); if (ocupado || bloqueado) return
    setOcupado(true); setError('')
    try {
      const importe = importeEntrada(monto)
      if (importe <= 0n || !concepto.trim()) throw new Error('Indica un monto mayor que cero y el concepto del movimiento.')
      await ejecutarComercial({ tipo: 'caja.movimiento', ruta: `/caja/sesiones/${sesionId}/movimientos`, sesionId,
        cuerpo: { tipo, monto: desdeCentimos(importe), concepto: concepto.trim(), comprobante_respaldo: respaldo.trim(), ...(tipo === 'egreso' ? { autorizacion_id: autorizacion.trim() } : {}) } })
      onGuardar(); onCerrar()
    } catch (e) { setError(e.message) }
    finally { setOcupado(false) }
  }
  return <Modal titulo="Registrar movimiento de caja" bloqueado={ocupado} onCerrar={cerrar}>
    {salida ? <div className="space-y-4"><p>¿Descartar este movimiento sin registrar?</p><div className="flex flex-wrap gap-3"><BotonBase onClick={() => setSalida(false)}>Seguir editando</BotonBase><BotonSecundario onClick={onCerrar}>Descartar movimiento</BotonSecundario></div></div> : <form onSubmit={guardar} className="space-y-4">
      <fieldset disabled={ocupado || bloqueado} className="space-y-4">
        <label className="block">Tipo de movimiento<select aria-label="Tipo de movimiento" className="vz-purchase-input mt-2 w-full" value={tipo} onChange={e => { setTipo(e.target.value); setAutorizacion('') }}><option value="ingreso">Ingreso de efectivo</option><option value="egreso">Egreso de efectivo</option></select></label>
        <label className="block">Monto del movimiento (S/)<input className="vz-purchase-input mt-2 w-full" value={monto} onChange={e => { setMonto(e.target.value); setAutorizacion('') }} inputMode="decimal" maxLength={14} required/></label>
        <label className="block">Concepto<input className="vz-purchase-input mt-2 w-full" value={concepto} onChange={e => { setConcepto(e.target.value); setAutorizacion('') }} maxLength={255} required/></label>
        <label className="block">Documento de respaldo (opcional)<input className="vz-purchase-input mt-2 w-full" value={respaldo} onChange={e => setRespaldo(e.target.value)} maxLength={100}/></label>
        {tipo === 'egreso' && <div className="space-y-3"><p className="text-xs text-app-secundario">El egreso necesita una autorización vigente del administrador para tu usuario y esta sesión. La aprobación dura cinco minutos.</p><label className="block">ID de autorización<input className="vz-purchase-input mt-2 w-full" value={autorizacion} onChange={e => setAutorizacion(e.target.value)} inputMode="numeric" maxLength={19} required/></label>{aprobar && <BotonBase className="border border-app-borde" disabled={!concepto.trim()} onClick={crearAprobacion}>Autorizar este egreso</BotonBase>}</div>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-app-error">{error}</p>}
      <p className="text-xs text-app-secundario">No modifica ventas ni compras. Un egreso no puede superar el efectivo disponible en esta sesión.</p>
      <div className="flex flex-wrap justify-end gap-3"><BotonBase disabled={ocupado} onClick={cerrar}>Cancelar</BotonBase><BotonSecundario type="submit" disabled={ocupado || bloqueado}>Confirmar movimiento</BotonSecundario></div>
    </form>}
  </Modal>
}
