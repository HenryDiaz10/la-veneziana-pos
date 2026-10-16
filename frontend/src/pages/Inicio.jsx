import { useAuthStore } from '../stores/auth.store.js'
import Badge from '../components/ui/Badge.jsx'

// Contenido de inicio; AdminLayout aporta la navegación y la cabecera.
function Inicio() {
  const usuario = useAuthStore(state => state.usuario)

  // La ruta protegida comprueba la sesión antes de mostrar esta página.
  if (!usuario) {
    return null
  }

  return (
    <section
      aria-labelledby="titulo-inicio"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-app-borde bg-app-superficie p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-widest text-app-secundario">
        Panel de inicio
      </p>

      <h1
        id="titulo-inicio"
        className="mt-3 break-words font-titulo text-2xl font-bold text-app-texto sm:text-3xl"
      >
        Bienvenido, {usuario.nombre}
      </h1>

      <p className="mt-4 text-app-secundario">
        Accede desde el menú a las secciones disponibles para tu cuenta.
      </p>

      {/* Los estados se identifican mediante texto y color. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge variante="exito">
          Sesión activa
        </Badge>

        <Badge>
          Rol: {usuario.rol.nombre}
        </Badge>
      </div>
    </section>
  )
}

export default Inicio