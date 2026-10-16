import { useEffect, useState } from 'react'

import BotonBase from '../ui/BotonBase.jsx'
import { consultarCategorias } from '../../services/catalogo.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'

function SelectorCategoria({
  id,
  valor,
  onChange,
  disabled = false,
  error = ''
}) {
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  const [solicitud, setSolicitud] = useState({
    pagina: 1,
    revision: 0
  })

  const [consulta, setConsulta] = useState({
    solicitud: null,
    categorias: [],
    paginacion: null,
    error: ''
  })

  // Conservar el nombre elegido al pasar a otra página de opciones.
  const [nombreSeleccionado, setNombreSeleccionado] = useState('')

  const cargando = consulta.solicitud !== solicitud
  const errorConsulta = cargando ? '' : consulta.error
  const categorias = cargando ? [] : consulta.categorias
  const seleccionVisible = categorias.some(
    categoria => String(categoria.id) === valor
  )

  const claseBoton =
    'border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover'

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarCategorias() {
      try {
        const respuesta = await consultarCategorias({
          pagina: solicitud.pagina,
          limite: 20,
          signal: controlador.signal
        })

        if (controlador.signal.aborted) return

        setConsulta({
          solicitud,
          categorias: respuesta.categorias,
          paginacion: respuesta.paginacion,
          error: ''
        })
      } catch (errorCarga) {
        if (controlador.signal.aborted) return

        if (errorCarga instanceof ErrorApi && errorCarga.estado === 401) {
          await comprobarSesion()
          return
        }

        setConsulta({
          solicitud,
          categorias: [],
          paginacion: null,
          error: errorCarga instanceof ErrorApi
            ? errorCarga.message
            : 'No se pudieron consultar las categorías.'
        })
      }
    }

    void cargarCategorias()

    return () => {
      controlador.abort()
    }
  }, [solicitud, comprobarSesion])

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold"
      >
        Categoría *
      </label>

      <select
        id={id}
        name="categoria_id"
        value={valor}
        required
        disabled={disabled || cargando || Boolean(errorConsulta)}
        onChange={evento => {
          setNombreSeleccionado(
            evento.target.selectedOptions[0]?.textContent ?? ''
          )
          onChange(evento.target.value)
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ''}`}
        className="min-h-11 w-full rounded-lg border border-app-borde bg-app-fondo px-3 py-3 text-app-texto"
      >
        <option value="">Selecciona una categoría</option>

        {/* Mantener la selección aunque no pertenezca a esta página. */}
        {valor && !seleccionVisible && (
          <option value={valor}>
            {nombreSeleccionado || 'Categoría asignada actualmente'}
          </option>
        )}

        {categorias.map(categoria => (
          <option
            key={categoria.id}
            value={String(categoria.id)}
            disabled={!categoria.activa}
          >
            {categoria.nombre}
            {!categoria.activa ? ' (inactiva)' : ''}
          </option>
        ))}
      </select>

      <p
        id={`${id}-ayuda`}
        className="mt-2 text-sm text-app-secundario"
      >
        {cargando
          ? 'Consultando categorías…'
          : 'Solo puedes seleccionar categorías activas.'}
      </p>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-app-error"
        >
          {error}
        </p>
      )}

      {errorConsulta && (
        <div className="mt-3">
          <p role="alert" className="mb-2 text-sm text-app-error">
            {errorConsulta}
          </p>

          <BotonBase
            disabled={disabled}
            onClick={() => {
              setSolicitud(actual => ({
                ...actual,
                revision: actual.revision + 1
              }))
            }}
            className={claseBoton}
          >
            Reintentar categorías
          </BotonBase>
        </div>
      )}

      {!cargando && consulta.paginacion && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <BotonBase
            disabled={disabled || solicitud.pagina <= 1}
            onClick={() => {
              setSolicitud(actual => ({
                ...actual,
                pagina: actual.pagina - 1
              }))
            }}
            className={claseBoton}
          >
            Categorías anteriores
          </BotonBase>

          <BotonBase
            disabled={
              disabled ||
              solicitud.pagina >= consulta.paginacion.totalPaginas ||
              solicitud.pagina >= 10000
            }
            onClick={() => {
              setSolicitud(actual => ({
                ...actual,
                pagina: actual.pagina + 1
              }))
            }}
            className={claseBoton}
          >
            Más categorías
          </BotonBase>

          <span className="text-sm text-app-secundario">
            Página {solicitud.pagina} de{' '}
            {Math.max(1, consulta.paginacion.totalPaginas)}
          </span>
        </div>
      )}
    </div>
  )
}

export default SelectorCategoria