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
import PuntoVenta from './pages/PuntoVenta.jsx'
import Pagos from './pages/Pagos.jsx'

import Catalogo from './pages/Catalogo.jsx'
import Clientes from './pages/Clientes.jsx'
import Recetas from './pages/Recetas.jsx'
import Inventario from './pages/Inventario.jsx'
import Compras from './pages/Compras.jsx'
import SincronizadorCarrito from './components/SincronizadorCarrito.jsx'
import MantenerSesion from './components/MantenerSesion.jsx'
import PruebasCarrito from './pages/PruebasCarrito.jsx'


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

    {/* Recuperar y guardar el borrador según la sesión activa. */}
    <SincronizadorCarrito />
    <MantenerSesion />

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
          className="app-shell vz-status-screen"
        >
          <section className="vz-status-card">
            <p className="font-marca text-3xl">
              La Veneziana
            </p>

            <h1 className="mt-6 font-titulo text-xl font-semibold">
              {comprobando
                ? 'Comprobando tu sesión'
                : 'No pudimos comprobar tu sesión'}
            </h1>

            {comprobando ? (
              <p role="status" className="mt-3 text-sm text-app-secundario">
                Espera un momento, por favor.
              </p>
            ) : (
              <>
                <p role="alert" className="mt-3 text-sm text-app-secundario">
                  {error || 'Inténtalo nuevamente.'}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void comprobarSesion()
                  }}
                  className="mt-6 min-h-12 w-full rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400"
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

          {/* Administración del catálogo con permiso específico. */}
          <Route
            element={
              <ProtectedRoute
                modulo="catalogo"
                accion="gestionar"
              />
            }
          >
            <Route element={<AdminLayout />}>
              <Route
                path="/catalogo"
                element={<Catalogo />}
              />
              <Route path="/recetas" element={<Recetas />} />
              {/* Prueba protegida por el permiso de catálogo y disponible
                  únicamente al ejecutar la aplicación en desarrollo. */}
              {import.meta.env.DEV && (
                <Route
                  path="/pruebas-carrito"
                  element={<PruebasCarrito />}
                />
              )}
            </Route>
          </Route>

          <Route element={<ProtectedRoute modulo="clientes" accion="buscar" />}>
            <Route element={<AdminLayout />}>
              <Route path="/clientes" element={<Clientes />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute modulo="inventario" accion="gestionar" />}>
            <Route element={<AdminLayout />}>
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/compras" element={<Compras />} />
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
            <Route element={<AdminLayout />}>
              <Route
                path="/pos"
                element={<PuntoVenta />}
              />
              <Route path="/pagos" element={<Pagos />} />
            </Route>
          </Route>

          {/* Informar cuando la dirección no corresponde a una página. */}
          <Route
            path="*"
            element={
              <main
                id="contenido-principal"
                tabIndex={-1}
                className="app-shell vz-status-screen"
              >
                <section className="vz-status-card">
                  <h1 className="font-titulo text-2xl font-semibold">
                    Página no encontrada
                  </h1>

                  <p className="mt-3 text-sm text-app-secundario">
                    La dirección que abriste no corresponde a una página.
                  </p>

                  <Link
                    to="/inicio"
                    replace
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400"
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
