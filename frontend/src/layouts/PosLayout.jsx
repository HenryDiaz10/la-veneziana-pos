import { Link, Outlet } from 'react-router-dom'

import SelectorTema from '../components/SelectorTema.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useAuthStore } from '../stores/auth.store.js'

// Estructura del punto de venta, sin menú lateral.
function PosLayout() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)

  // Este layout se utilizará dentro de una ruta protegida.
  if (!usuario) {
    return null
  }

  return (
    <div className="app-shell min-h-dvh bg-app-fondo text-app-texto">
      <header className="border-b border-app-borde bg-app-superficie">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link
              to="/inicio"
              className="inline-flex min-h-11 items-center rounded-lg font-titulo text-xl font-bold"
            >
              La Veneziana
            </Link>

            <p className="text-sm text-app-secundario">
              Punto de venta
            </p>
          </div>

          {/* Identidad y acciones en la parte superior derecha. */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <p
                title={usuario.nombre}
                className="max-w-48 truncate text-sm font-semibold"
              >
                {usuario.nombre}
              </p>

              <div className="mt-1">
                <Badge>{usuario.rol.nombre}</Badge>
              </div>
            </div>

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
        </div>
      </header>

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="min-w-0 p-4 sm:p-6"
      >
        {/* Mostrar un fallo de cierre manteniendo la sesión visible. */}
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error"
          >
            {error}
          </p>
        )}

        {/* La página del POS distribuirá productos y carrito. */}
        <Outlet />
      </main>
    </div>
  )
}

export default PosLayout