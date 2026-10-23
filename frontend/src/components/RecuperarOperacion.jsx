import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'
import { useComercial, recuperarComercial } from '../stores/comercial.store.js'
import BotonBase from './ui/BotonBase.jsx'

// Visible en todas las rutas para recuperar incluso después de F5 o navegar.
export default function RecuperarOperacion() {
  const id = useAuthStore(s => s.usuario?.id)
  const registro = useComercial(id)
  const [ocupado, setOcupado] = useState(false), [mensaje, setMensaje] = useState('')
  async function recuperar(resolver) {
    setOcupado(true); setMensaje('')
    try {
      const r = await recuperarComercial(resolver)
      setMensaje(r?.cancelada ? 'Intento cancelado sin registrar una nueva operación.' : 'Resultado recuperado. Puedes continuar con el pedido.')
    } catch (e) { setMensaje(e.message) }
    finally { setOcupado(false) }
  }
  if (!id || (!registro.pendiente && !registro.error && !mensaje)) return null
  return <aside className="vz-panel m-3 space-y-3 border-amber-500" aria-label="Recuperación de operación"><p className="text-sm font-semibold">{registro.error ?? (registro.pendiente ? 'Hay una operación pendiente de confirmar. No vuelvas a cobrar ni registres otro pedido hasta recuperar su resultado.' : mensaje)}</p>
    {registro.pendiente && <div className="flex flex-wrap gap-3"><BotonBase disabled={ocupado} className="border border-app-borde" onClick={() => recuperar(false)}>Recuperar resultado</BotonBase><BotonBase disabled={ocupado} className="border border-app-borde" onClick={() => recuperar(true)}>Resolver intento pendiente</BotonBase></div>}
    {mensaje && registro.pendiente && <p role="status" className="text-sm">{mensaje}</p>}
    {!registro.pendiente && mensaje && <div className="flex gap-3"><Link to="/pagos" className="underline">Ir a pagos</Link><button type="button" className="underline" onClick={() => setMensaje('')}>Cerrar aviso</button></div>}
  </aside>
}
