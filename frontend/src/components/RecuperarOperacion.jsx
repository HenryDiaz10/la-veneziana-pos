import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'
import { useComercial, recuperarComercial } from '../stores/comercial.store.js'
import BotonBase from './ui/BotonBase.jsx'

// Visible en todas las rutas para recuperar incluso después de F5 o navegar.
export default function RecuperarOperacion() {
  const id = useAuthStore(s => s.usuario?.id)
  return <Contenido key={id} id={id}/>
}
function Contenido({ id }) {
  const registro = useComercial(id)
  const [ocupado, setOcupado] = useState(false), [mensaje, setMensaje] = useState('')
  const [destino, setDestino] = useState('/pagos')
  async function recuperar(resolver) {
    setOcupado(true); setMensaje('')
    setDestino(registro.pendiente?.tipo.startsWith('caja.') ? '/caja' : '/pagos')
    try {
      const r = await recuperarComercial(resolver)
      setMensaje(r?.cancelada ? 'Intento cancelado sin registrar una nueva operación.' : 'Resultado recuperado. Puedes consultar la operación confirmada.')
    } catch (e) { setMensaje(e.message) }
    finally { setOcupado(false) }
  }
  if (!id || (!registro.pendiente && !registro.error && !mensaje)) return null
  return <aside className="vz-panel m-3 space-y-3 border-amber-500" aria-label="Recuperación de operación"><p className="text-sm font-semibold">{registro.error ?? (registro.pendiente ? 'Hay una operación pendiente de confirmar. Recupera su resultado antes de repetirla o registrar otra operación.' : mensaje)}</p>
    {registro.pendiente && <div className="flex flex-wrap gap-3"><BotonBase disabled={ocupado} className="border border-app-borde" onClick={() => recuperar(false)}>Recuperar resultado</BotonBase><BotonBase disabled={ocupado} className="border border-app-borde" onClick={() => recuperar(true)}>Resolver intento pendiente</BotonBase></div>}
    {mensaje && registro.pendiente && <p role="status" className="text-sm">{mensaje}</p>}
    {!registro.pendiente && mensaje && <div className="flex gap-3"><Link to={destino} className="underline">{destino === '/caja' ? 'Ir a caja' : 'Ir a pagos'}</Link><button type="button" className="underline" onClick={() => setMensaje('')}>Cerrar aviso</button></div>}
  </aside>
}
