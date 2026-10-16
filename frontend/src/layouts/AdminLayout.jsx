import { useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import SelectorTema from '../components/SelectorTema.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useAuthStore } from '../stores/auth.store.js'

function AdminLayout() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)

  const [menuAbierto, setMenuAbierto] = useState(false)
  const botonMenu = useRef(null)

  // El layout se montará dentro de ProtectedRoute.
  if (!usuario) {
    return null
  }

  const puedeGestionarSeguridad = usuario.permisos.some(
    permiso =>
      permiso.modulo === 'seguridad' &&
      permiso.accion === 'gestionar'
  )

  // Mostrar únicamente enlaces a pantallas que ya existen.
  const enlaces = [
    { ruta: '/inicio', texto: 'Inicio' }
  ]

    // Mostrar el acceso al POS solo con el permiso de cobro.
  // ProtectedRoute también comprueba este permiso al entrar.
  const puedeCobrar = usuario.permisos.some(
    permiso =>
      permiso.modulo === 'ventas' &&
      permiso.accion === 'cobrar'
  )

  if (puedeCobrar) {
    enlaces.push({
      ruta: '/pos',
      texto: 'Punto de venta'
    })
  }

  if (puedeGestionarSeguridad) {
    enlaces.push({
      ruta: '/seguridad',
      texto: 'Seguridad'
    })

    if (import.meta.env.DEV) {
      enlaces.push({
        ruta: '/componentes',
        texto: 'Componentes'
      })
    }
  }

  function manejarTeclado(evento) {
    // El menú compacto es desplegable, no un diálogo modal.
    if (evento.key === 'Escape' && menuAbierto) {
      setMenuAbierto(false)
      botonMenu.current?.focus()
    }
  }

  return (
    <div
      className="app-shell min-h-dvh bg-app-fondo text-app-texto"
      onKeyDown={manejarTeclado}
    >
      <header className="border-b border-app-borde bg-app-superficie">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/inicio"
            className="rounded-lg font-titulo text-xl font-bold"
          >
            La Veneziana
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {/* El nombre completo permanece disponible en el texto. */}
            <span
              title={usuario.nombre}
              className="max-w-48 truncate text-sm font-semibold"
            >
              {usuario.nombre}
            </span>

            <SelectorTema />

            <BotonSecundario
              cargando={operacion === 'logout'}
              textoCargando="Cerrando sesión…"
              onClick={() => {
                void salir()
              }}
            >
              Cerrar sesión
            </BotonSecundario>
          </div>

          {/* En escritorio el menú permanece visible. */}
          <BotonBase
            ref={botonMenu}
            aria-expanded={menuAbierto}
            aria-controls="menu-administracion"
            onClick={() => {
              setMenuAbierto(abierto => !abierto)
            }}
            className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover lg:hidden"
          >
            {menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          </BotonBase>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          id="menu-administracion"
          className={[
            'border-b border-app-borde bg-app-superficie',
            'lg:block lg:min-h-[calc(100dvh-6rem)] lg:border-r lg:border-b-0',
            menuAbierto ? 'block' : 'hidden'
          ].join(' ')}
        >
          <div className="border-b border-app-borde p-5">
            <p className="mb-3 text-sm text-app-secundario">
              Perfil de acceso
            </p>

            <Badge>
              {usuario.rol.nombre}
            </Badge>
          </div>

          <nav aria-label="Navegación principal" className="p-3">
            <ul className="space-y-2">
              {enlaces.map(enlace => (
                <li key={enlace.ruta}>
                  <NavLink
                    to={enlace.ruta}
                    end
                    onClick={() => {
                      setMenuAbierto(false)
                    }}
                    className={({ isActive }) => [
                      'flex min-h-11 items-center rounded-lg border-l-4',
                      'px-4 py-3 text-sm font-semibold',
                      isActive
                        ? 'border-marca-dorado bg-amber-500/15 text-app-texto'
                        : 'border-transparent text-app-secundario hover:bg-app-hover hover:text-app-texto'
                    ].join(' ')}
                  >
                    {enlace.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main
          id="contenido-principal"
          tabIndex={-1}
          className="min-w-0 p-4 sm:p-6 lg:p-8"
        >
          {/* Conservar los errores de cierre sin retirar la identidad. */}
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error"
            >
              {error}
            </p>
          )}

          {/* Aquí aparecerá la página correspondiente a la ruta. */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout