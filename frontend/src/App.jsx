import { useEffect } from 'react'

import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation
} from 'react-router-dom'

import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import { useAuthStore } from './stores/auth.store.js'

import Seguridad from './pages/Seguridad.jsx'

import Componentes from './pages/Componentes.jsx'

import AdminLayout from './layouts/AdminLayout.jsx'

import PosLayout from './layouts/PosLayout.jsx'
import PuntoVenta from './pages/PuntoVenta.jsx'

// Aceptar únicamente destinos internos.
// Evitar enlaces externos y el regreso al propio login.
function obtenerDestinoLogin(desde) {
  if (
    typeof desde !== 'string' ||
    !desde.startsWith('/') ||
    desde.startsWith('//') ||

    Array.from(desde).some(caracter =>
      caracter === '\\' ||
      caracter.charCodeAt(0) <= 32 ||
      caracter.charCodeAt(0) === 127
    )
  ) {
    return '/inicio'
  }

  try {
    // Interpretar la ruta sin realizar ninguna solicitud.
    const base = 'https://ruta.local'
    const destino = new URL(desde, base)
    const pathname = destino.pathname.replace(/\/+$/, '').toLowerCase()

    if (
      destino.origin !== base ||
      pathname === '/login'
    ) {
      return '/inicio'
    }

    return destino.pathname + destino.search + destino.hash
  } catch {
    return '/inicio'
  }
}

// Mostrar el login solo cuando no haya una sesión autenticada.
function RutaLogin() {
  const estado = useAuthStore(state => state.estado)
  const usuario = useAuthStore(state => state.usuario)
  const location = useLocation()

  if (estado === 'autenticado' && usuario) {
    return (
      <Navigate
        to={obtenerDestinoLogin(location.state?.desde)}
        replace
      />
    )
  }

  return <Login />
}

function App() {
  const estado = useAuthStore(state => state.estado)
  const error = useAuthStore(state => state.error)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  // Recuperar la sesión antes de decidir qué página mostrar.
  useEffect(() => {
    void comprobarSesion()
  }, [comprobarSesion])

  const comprobando = estado === 'comprobando'
  const esperandoSesion = comprobando || estado === 'error'

  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:text-texto"
      >
        Saltar al contenido
      </a>

      {esperandoSesion ? (
        // Mantener también el login en espera durante la consulta inicial.
        <main
          id="contenido-principal"
          tabIndex={-1}
          aria-busy={comprobando}
          className="login-screen flex min-h-dvh items-center justify-center px-5 py-10"
        >
          <section className="login-glass relative z-10 w-full max-w-lg rounded-3xl p-6 text-white sm:p-9">
            <p className="font-marca text-3xl">
              La Veneziana
            </p>

            <h1 className="mt-6 font-titulo text-xl font-semibold">
              {comprobando
                ? 'Comprobando tu sesión'
                : 'No pudimos comprobar tu sesión'}
            </h1>

            {comprobando ? (
              <p role="status" className="mt-3 text-sm text-slate-200">
                Espera un momento, por favor.
              </p>
            ) : (
              <>
                <p role="alert" className="mt-3 text-sm text-slate-200">
                  {error || 'Inténtalo nuevamente.'}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void comprobarSesion()
                  }}
                  className="login-submit mt-6 min-h-12 w-full rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400"
                >
                  Reintentar
                </button>
              </>
            )}
          </section>
        </main>
      ) : (
        <Routes>
          {/* La dirección raíz lleva al inicio protegido. */}
          <Route
            path="/"
            element={<Navigate to="/inicio" replace />}
          />

          <Route
            path="/login"
            element={<RutaLogin />}
          />

          {/* Comprobar la sesión antes de mostrar el layout. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/inicio"
                element={<Inicio />}
              />
            </Route>
          </Route>

          {/* Comprobar el permiso antes de montar estas páginas
              y su layout. El backend también valida el acceso. */}
          <Route
            element={
              <ProtectedRoute
                modulo="seguridad"
                accion="gestionar"
              />
            }
          >
            <Route element={<AdminLayout />}>
              <Route
                path="/seguridad"
                element={<Seguridad />}
              />

              {/* Galería disponible únicamente en desarrollo. */}
              {import.meta.env.DEV && (
                <Route
                  path="/componentes"
                  element={<Componentes />}
                />
              )}
            </Route>
          </Route>

          {/* Acceso al POS con sesión y permiso de cobro. */}
          <Route
            element={
              <ProtectedRoute
                modulo="ventas"
                accion="cobrar"
              />
            }
          >
            <Route element={<PosLayout />}>
              <Route
                path="/pos"
                element={<PuntoVenta />}
              />
            </Route>
          </Route>

          {/* Informar cuando la dirección no corresponde a una página. */}
          <Route
            path="*"
            element={
              <main
                id="contenido-principal"
                tabIndex={-1}
                className="login-screen flex min-h-dvh items-center justify-center px-5 py-10"
              >
                <section className="login-glass relative z-10 w-full max-w-lg rounded-3xl p-6 text-white sm:p-9">
                  <h1 className="font-titulo text-2xl font-semibold">
                    Página no encontrada
                  </h1>

                  <p className="mt-3 text-sm text-slate-200">
                    La dirección que abriste no corresponde a una página.
                  </p>

                  <Link
                    to="/inicio"
                    replace
                    className="login-submit mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400"
                  >
                    Volver al inicio
                  </Link>
                </section>
              </main>
            }
          />
        </Routes>
      )}
    </>
  )
}

export default App
