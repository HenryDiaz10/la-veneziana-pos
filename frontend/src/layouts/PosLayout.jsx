import { Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import { useAuthStore } from '../stores/auth.store.js'

function PosLayout() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)
  if (!usuario) return null
  return (
    <div className="app-shell vz-shell">
      <AppHeader usuario={usuario} operacion={operacion} salir={salir} titulo="Punto de venta"/>
      <main id="contenido-principal" tabIndex={-1} className="vz-main">
        {error && <p role="alert" className="mb-5 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error">{error}</p>}
        <Outlet/>
      </main>
    </div>
  )
}
export default PosLayout
