import { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
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
  if (!usuario) return null

  // Conservar los permisos reales: el diseño no habilita nuevas secciones.
  const permite = (modulo, accion) => usuario.permisos.some(p => p.modulo === modulo && p.accion === accion)
  const enlaces = [{ ruta: '/inicio', texto: 'Inicio', icono: 'inicio' }]
  if (permite('ventas', 'cobrar')) enlaces.push({ ruta: '/pos', texto: 'Punto de venta', icono: 'carrito' })
  if (permite('ventas', 'cobrar')) enlaces.push({ ruta: '/pagos', texto: 'Pagos de pedidos', icono: 'billete' })
  if (permite('catalogo', 'gestionar')) enlaces.push({ ruta: '/catalogo', texto: 'Catálogo', icono: 'catalogo' })
  if (permite('catalogo', 'gestionar')) enlaces.push({ ruta: '/recetas', texto: 'Recetas', icono: 'recetas' })
  if (permite('clientes', 'buscar')) enlaces.push({ ruta: '/clientes', texto: 'Clientes', icono: 'clientes' })
  if (permite('inventario', 'gestionar')) enlaces.push({ ruta: '/inventario', texto: 'Inventario', icono: 'inventario' })
  if (permite('inventario', 'gestionar')) enlaces.push({ ruta: '/compras', texto: 'Compras', icono: 'compras' })
  if (permite('seguridad', 'gestionar')) {
    enlaces.push({ ruta: '/seguridad', texto: 'Seguridad', icono: 'seguridad' })
    if (import.meta.env.DEV) enlaces.push({ ruta: '/componentes', texto: 'Componentes', icono: 'componentes' })
  }
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
