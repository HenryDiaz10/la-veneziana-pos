import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { solicitarApi, ErrorApi } from '../services/api.js'
import { useAuthStore } from '../stores/auth.store.js'
import Icono from '../components/ui/Icono.jsx'
import Badge from '../components/ui/Badge.jsx'

function Seguridad() {
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  const [consulta, setConsulta] = useState({
    estado: 'cargando',
    roles: [],
    error: ''
  })

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarRoles() {
      try {
        const respuesta = await solicitarApi('/roles', {
          signal: controlador.signal
        })

        // Ignorar respuestas si la página ya fue desmontada.
        if (controlador.signal.aborted) {
          return
        }

        setConsulta({
          estado: 'completado',
          roles: respuesta.roles,
          error: ''
        })
      } catch (error) {
        if (controlador.signal.aborted) {
          return
        }

        // Si la cookie ya no autentica, actualizar el estado global.
        // ProtectedRoute decidirá la redirección al login.
        if (error instanceof ErrorApi && error.estado === 401) {
          await comprobarSesion()
          return
        }

        setConsulta({
          estado: 'error',
          roles: [],
          error: error instanceof ErrorApi
            ? error.message
            : 'No se pudieron consultar los roles.'
        })
      }
    }

    void cargarRoles()

    // Cancelar la consulta al salir o al repetir efectos en StrictMode.
    return () => {
      controlador.abort()
    }
  }, [comprobarSesion])

  return (
      // AdminLayout aporta el main y la navegación de esta página.
      <section
        aria-labelledby="titulo-seguridad"
        className="vz-page"
      >
        {/* Los colores app-* responden al tema seleccionado. */}
        <p className="vz-kicker">
          <Icono nombre="seguridad"/>Administración · Seguridad
        </p>

        <h1
          id="titulo-seguridad"
          className="vz-page-title"
        >
          Roles del sistema
        </h1>

        <p className="vz-page-description">
          Consulta los perfiles de acceso y sus permisos asignados.
        </p>

        {consulta.estado === 'cargando' && (
          <p role="status" className="mt-6 text-sm text-app-secundario">
            Consultando los roles…
          </p>
        )}

        {consulta.estado === 'error' && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-app-borde bg-app-elevada p-4 text-sm text-app-error"
          >
            {consulta.error}
          </p>
        )}

        {consulta.estado === 'completado' && (consulta.roles.length > 0 ? (
          <ul className="mt-7 grid gap-5 md:grid-cols-2">
            {consulta.roles.map(rol => (
              <li
                key={rol.id}
                className="vz-role-card min-w-0"
              >
                <div className="mb-5 flex items-center justify-between gap-3"><span className="vz-section-symbol"><Icono nombre={rol.nombre === 'administrador' ? 'seguridad' : 'usuario'}/></span><Badge>{rol.permisos.length} permisos</Badge></div>
                <h2 className="break-words font-titulo text-lg font-semibold">
                  {rol.nombre}
                </h2>

                {rol.descripcion && (
                  <p className="mt-2 break-words text-sm text-app-secundario">
                    {rol.descripcion}
                  </p>
                )}

                {/* Ajustar el texto cuando existe un solo permiso. */}
                <p className="mt-5 border-t border-app-borde pt-4 text-xs font-semibold">
                  {rol.permisos.length}{' '}
                  {rol.permisos.length === 1
                    ? 'permiso asignado'
                    : 'permisos asignados'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-app-secundario">
            No hay roles disponibles.
          </p>
        ))}

        <Link
          to="/inicio"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-app-hover"
        >
          Volver al inicio
        </Link>
      </section>
  )
}

export default Seguridad
