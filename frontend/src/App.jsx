import { useEffect } from 'react'

import Login from './pages/Login.jsx'
import { useAuthStore } from './stores/auth.store.js'

function App() {
  const estado = useAuthStore(state => state.estado)
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)

  const comprobarSesion = useAuthStore(state => state.comprobarSesion)
  const salir = useAuthStore(state => state.salir)

  // Recuperar la sesión al montar la aplicación.
  // El store comparte la solicitud si StrictMode repite el efecto.
  useEffect(() => {
    void comprobarSesion()
  }, [comprobarSesion])

  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:text-texto"
      >
        Saltar al contenido
      </a>

      {estado === 'sin_sesion' ? (
        <Login />
      ) : (
        <main
          id="contenido-principal"
          tabIndex={-1}
          aria-busy={estado === 'comprobando'}
          className="login-screen flex min-h-dvh items-center justify-center px-5 py-10"
        >
          <section className="login-glass relative z-10 w-full max-w-lg rounded-3xl p-6 text-white sm:p-9">
            <p className="font-marca text-3xl">
              La Veneziana
            </p>

            {estado === 'comprobando' && (
              <div role="status" className="mt-6">
                <h1 className="font-titulo text-xl font-semibold">
                  Comprobando tu sesión
                </h1>

                <p className="mt-3 text-sm text-slate-200">
                  Espera un momento, por favor.
                </p>
              </div>
            )}

            {estado === 'error' && (
              <div className="mt-6">
                <h1 className="font-titulo text-xl font-semibold">
                  No pudimos comprobar tu sesión
                </h1>

                <p role="alert" className="mt-3 text-sm text-slate-200">
                  {error}
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
              </div>
            )}

            {estado === 'autenticado' && usuario && (
              <div className="mt-6">
                <h1 className="font-titulo text-2xl font-semibold">
                  Bienvenido, {usuario.nombre}
                </h1>

                <p className="mt-3 text-sm text-slate-200">
                  Tu sesión está activa.
                </p>

                <p className="mt-2 text-sm text-slate-200">
                  Rol: {usuario.rol.nombre}
                </p>

                {error && (
                  <p role="alert" className="mt-5 text-sm text-amber-200">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={operacion === 'logout'}
                  onClick={() => {
                    void salir()
                  }}
                  className="login-submit mt-6 min-h-12 w-full rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {operacion === 'logout'
                    ? 'Cerrando sesión…'
                    : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </section>
        </main>
      )}
    </>
  )
}

export default App