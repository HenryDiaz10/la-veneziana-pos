import { useAuthStore } from '../stores/auth.store.js'

import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Badge from '../components/ui/Badge.jsx'

// Pantalla inicial disponible únicamente con una sesión válida.
function Inicio() {
  const usuario = useAuthStore(state => state.usuario)
  const operacion = useAuthStore(state => state.operacion)
  const error = useAuthStore(state => state.error)
  const salir = useAuthStore(state => state.salir)

  // ProtectedRoute comprueba el acceso antes de mostrar esta página.
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

        {/* Comunicar los estados mediante texto y color. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variante="exito">
            Sesión activa
          </Badge>

          <Badge>
            Rol: {usuario.rol.nombre}
          </Badge>
        </div>

        {/* Conservar el mensaje si no se pudo confirmar el cierre. */}
        {error && (
          <p role="alert" className="mt-5 text-sm text-amber-200">
            {error}
          </p>
        )}

        {/* El componente recibe el estado; Zustand ejecuta el cierre. */}
        <BotonSecundario
          cargando={cerrandoSesion}
          textoCargando="Cerrando sesión…"
          onClick={() => {
            void salir()
          }}
          className="mt-6 w-full"
        >
          Cerrar sesión
        </BotonSecundario>
      </section>
    </main>
  )
}

export default Inicio