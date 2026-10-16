import { useAuthStore } from '../stores/auth.store.js'

// Pantalla inicial disponible únicamente con una sesión válida.
function Inicio() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)

  // ProtectedRoute controlará el acceso antes de mostrar esta página.
  if (!usuario) {
    return null
  }

  const cerrandoSesion = operacion === 'logout'

  return (
    <main
      id="contenido-principal"
      tabIndex={-1}
      className="login-screen flex min-h-dvh items-center justify-center px-5 py-10"
    >
      <section
        aria-labelledby="titulo-inicio"
        className="login-glass relative z-10 w-full max-w-lg rounded-3xl p-6 text-white sm:p-9"
      >
        <p className="font-marca text-3xl">
          La Veneziana
        </p>

        <h1
          id="titulo-inicio"
          className="mt-6 font-titulo text-2xl font-semibold"
        >
          Bienvenido, {usuario.nombre}
        </h1>

        <p className="mt-3 text-sm text-slate-200">
          Tu sesión está activa.
        </p>

        <p className="mt-2 text-sm text-slate-200">
          Rol: {usuario.rol.nombre}
        </p>

        {/* Informar si el servidor no pudo confirmar el cierre. */}
        {error && (
          <p role="alert" className="mt-5 text-sm text-amber-200">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={cerrandoSesion}
          onClick={() => {
            void salir()
          }}
          className="login-submit mt-6 min-h-12 w-full rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-60"
        >
          {cerrandoSesion
            ? 'Cerrando sesión…'
            : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  )
}

export default Inicio