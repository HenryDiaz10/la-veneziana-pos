import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { solicitarApi, ErrorApi } from '../services/api.js'
import { useAuthStore } from '../stores/auth.store.js'

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
    <main
      id="contenido-principal"
      tabIndex={-1}
      className="login-screen min-h-dvh px-5 py-10 sm:px-8"
    >
      <section
        aria-labelledby="titulo-seguridad"
        className="login-glass relative z-10 mx-auto w-full max-w-3xl rounded-3xl p-6 text-white sm:p-9"
      >
        <p className="text-xs font-semibold tracking-widest text-amber-300">
          SEGURIDAD
        </p>

        <h1
          id="titulo-seguridad"
          className="mt-3 font-titulo text-2xl font-semibold"
        >
          Roles del sistema
        </h1>

        <p className="mt-3 text-sm text-slate-200">
          Consulta los perfiles de acceso y sus permisos asignados.
        </p>

        {consulta.estado === 'cargando' && (
          <p role="status" className="mt-6 text-sm text-slate-200">
            Consultando los roles…
          </p>
        )}

        {consulta.estado === 'error' && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-amber-300/30 bg-amber-950/30 p-4 text-sm text-amber-100"
          >
            {consulta.error}
          </p>
        )}

        {consulta.estado === 'completado' && (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {consulta.roles.map(rol => (
              <li
                key={rol.id}
                className="rounded-xl border border-white/15 bg-slate-950/25 p-5"
              >
                <h2 className="font-titulo text-lg font-semibold">
                  {rol.nombre}
                </h2>

                {rol.descripcion && (
                  <p className="mt-2 text-sm text-slate-200">
                    {rol.descripcion}
                  </p>
                )}

                <p className="mt-3 text-sm text-amber-200">
                  {rol.permisos.length} permisos asignados
                </p>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/inicio"
          className="mt-8 inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-semibold text-amber-300 hover:bg-white/10"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}

export default Seguridad