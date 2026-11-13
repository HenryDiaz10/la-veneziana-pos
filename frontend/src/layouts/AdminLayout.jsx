import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import { obtenerAccesos } from '../utils/accesos.js'
import Icono from '../components/ui/Icono.jsx'
import { useAuthStore } from '../stores/auth.store.js'

function AdminLayout() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const botonMenu = useRef(null)
  const location = useLocation()
  // Empezar cada sección por su encabezado sin cambiar el scroll propio del menú.
  // Los filtros y la paginación dentro de la misma ruta conservan su posición.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])
  if (!usuario) return null

  const enlaces = obtenerAccesos(usuario)
  const titulo = enlaces.find(e => e.ruta === location.pathname)?.texto ?? 'Administración'

  function manejarTeclado(evento) {
    if (evento.key === 'Escape' && menuAbierto) {
      setMenuAbierto(false)
      botonMenu.current?.focus()
    }
  }

  return (
    <div className="app-shell vz-shell" onKeyDown={manejarTeclado}>
      <AppHeader usuario={usuario} operacion={operacion} salir={salir} titulo={titulo}
        referenciaMenu={botonMenu} menuAbierto={menuAbierto} onMenu={() => setMenuAbierto(a => !a)}/>
      <div className="vz-admin-grid">
        <aside id="menu-administracion" className={`vz-sidebar ${menuAbierto ? 'is-open' : ''}`}>
          <p className="vz-nav-caption">Tu espacio de trabajo</p>
          <nav aria-label="Navegación principal">
            <ul>{enlaces.map(enlace => (
              <li key={enlace.ruta}>
                <NavLink to={enlace.ruta} end className="vz-nav-link" onClick={() => setMenuAbierto(false)}>
                  <Icono nombre={enlace.icono}/><span>{enlace.texto}</span>
                </NavLink>
              </li>
            ))}</ul>
          </nav>
          <div className="vz-sidebar-footer">
            <div className="vz-session-card">
              <p><span className="vz-live-dot"/>Sesión iniciada</p>
              <small className="capitalize">Perfil: {usuario.rol.nombre}</small>
            </div>
            <p className="mt-5 px-1 text-[10px] tracking-wider text-slate-400">LA VENEZIANA · CADA DETALLE CUENTA</p>
          </div>
        </aside>
        <main id="contenido-principal" tabIndex={-1} className="vz-main">
          {error && <p role="alert" className="mb-5 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error">{error}</p>}
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
export default AdminLayout
