import {
  Link,
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom'

import { useAuthStore } from '../stores/auth.store.js'

function ProtectedRoute({ modulo, accion }) {
  const location = useLocation()

  const estado = useAuthStore(state => state.estado)
  const usuario = useAuthStore(state => state.usuario)
  const error = useAuthStore(state => state.error)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  // Esperar la consulta inicial antes de mostrar contenido protegido.
  // Un fallo de conexión debe permitir reintentar, no simular un logout.
  if (estado === 'comprobando' || estado === 'error') {
    const comprobando = estado === 'comprobando'

    return (
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
    )
  }

  // Sin identidad válida, ir al login y recordar la ruta solicitada.
  // replace evita acumular redirecciones en el historial.
  if (estado !== 'autenticado' || !usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          desde: location.pathname + location.search + location.hash
        }}
      />
    )
  }

  // Si se configura un permiso, exigir módulo y acción exactos.
  // Una configuración incompleta también deniega el acceso.
  const requierePermiso =
    modulo !== undefined || accion !== undefined

  const tienePermiso =
    typeof modulo === 'string' &&
    modulo.length > 0 &&
    typeof accion === 'string' &&
    accion.length > 0 &&
    Array.isArray(usuario.permisos) &&
    usuario.permisos.some(permiso =>
      permiso.modulo === modulo &&
      permiso.accion === accion
    )

  if (requierePermiso && !tienePermiso) {
    return (
      <main
        id="contenido-principal"
        tabIndex={-1}
        className="login-screen flex min-h-dvh items-center justify-center px-5 py-10"
      >
        <section className="login-glass relative z-10 w-full max-w-lg rounded-3xl p-6 text-white sm:p-9">
          <p className="text-sm font-semibold text-amber-300">
            ACCESO RESTRINGIDO
          </p>

          <h1 className="mt-4 font-titulo text-2xl font-semibold">
            No tienes acceso a esta sección
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Tu cuenta no tiene el permiso necesario.
            Contacta al administrador si necesitas acceso.
          </p>

          <Link
            to="/"
            replace
            className="login-submit mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    )
  }

  // Renderizar únicamente la ruta hija que superó las comprobaciones.
  return <Outlet />
}

export default ProtectedRoute