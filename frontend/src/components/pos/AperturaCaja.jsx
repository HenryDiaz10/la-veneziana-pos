import { useState } from 'react'
import { solicitarApi } from '../../services/api.js'
import { ejecutarComercial, useComercial } from '../../stores/comercial.store.js'
import { useAuthStore } from '../../stores/auth.store.js'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { importeEntrada } from '../../utils/pagos-mixtos.js'
import { desdeCentimos } from '../../utils/carrito-calculo.js'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import BotonBase from '../ui/BotonBase.jsx'
const consultar = (_, signal) => solicitarApi('/caja/sesion', { signal })
const SOLICITUD = {}
export default function AperturaCaja({ onAbrir }) {
  const usuario = useAuthStore(s => s.usuario)
  const autorizado = usuario?.permisos.some(p => p.modulo === 'caja' && p.accion === 'gestionar')
  const comercial = useComercial(usuario?.id)
  const { datos, error, pendiente, reintentar } = useConsultaRemota(consultar, autorizado ? SOLICITUD : null)
  const [caja, setCaja] = useState(''), [monto, setMonto] = useState(''), [ocupado, setOcupado] = useState(false), [aviso, setAviso] = useState('')
  // Una caja retirada o reasignada deja de ser una selección válida al refrescar.
  const seleccionValida=Boolean(datos?.cajas.some(c=>String(c.id)===caja))
  async function abrir(e) {
    e.preventDefault(); if (ocupado || pendiente || !seleccionValida) return
    setOcupado(true); setAviso('')
    try {
      const apertura = desdeCentimos(importeEntrada(monto))
      await ejecutarComercial({ tipo: 'caja.abrir', ruta: '/caja/sesiones', cuerpo: { caja_fisica_id: Number(caja), apertura_monto_base: apertura } })
      reintentar(); onAbrir()
    } catch (e) { setAviso(e.message) }
    finally { setOcupado(false) }
  }
  if (!autorizado) return <p className="vz-panel">La apertura de caja requiere el permiso caja/gestionar.</p>
  return <div className="vz-panel mb-5 space-y-3"><h2 className="font-bold">Tu sesión de caja</h2>{datos?.sesion ? <p>Sesión #{datos.sesion.id} abierta · Fondo inicial S/ {datos.sesion.apertura_monto_base}</p> : <form onSubmit={abrir} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">Caja<select aria-label="Caja" className="vz-purchase-input w-full" value={seleccionValida?caja:""} disabled={pendiente || ocupado || !datos?.cajas.length} onChange={e => setCaja(e.target.value)} required><option value="">{pendiente?"Consultando cajas…":datos&&!datos.cajas.length?"No tienes cajas activas asignadas":"Selecciona caja"}</option>{datos?.cajas.map(c => <option key={c.id} value={c.id}>{c.nombre_terminal}</option>)}</select></label><label className="min-w-0">Fondo inicial (S/)<input className="vz-purchase-input w-full" value={monto} inputMode="decimal" maxLength={12} onChange={e => setMonto(e.target.value)} required/></label><BotonSecundario type="submit" disabled={pendiente || ocupado || !seleccionValida || Boolean(comercial.pendiente || comercial.error)}>Confirmar apertura</BotonSecundario></form>}{datos&&!datos.sesion&&!datos.cajas.length&&<p className="text-sm text-app-secundario">No tienes cajas activas asignadas. El administrador debe configurarlas en Arqueo de caja → Administrar cajas.</p>}<BotonBase disabled={pendiente || ocupado} onClick={() => { reintentar(); onAbrir() }}>Actualizar caja</BotonBase>{(error || aviso) && <p role="alert" className="text-app-error">{error || aviso}</p>}</div>
}
