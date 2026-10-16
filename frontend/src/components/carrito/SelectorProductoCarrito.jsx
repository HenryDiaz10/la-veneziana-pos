import { useState } from 'react'

import BotonBase from '../ui/BotonBase.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import {
  consultarConfiguracionCarrito
} from '../../services/carrito.service.js'
import {
  estimarSeleccionCarrito
} from '../../utils/carrito-estimacion.js'

// Mantener una referencia estable evita repetir la consulta
// en cada renderizado del componente.
function cargarConfiguracion(productoId, signal) {
  return consultarConfiguracionCarrito(productoId, { signal })
}

// El componente recibe un producto del catálogo.
// onConfirmar recibe únicamente los identificadores y la cantidad.
export default function SelectorProductoCarrito({
  producto,
  onConfirmar,
  deshabilitado = false,
  seleccionInicial = null,
  textoConfirmar = 'Añadir selección al borrador'
}) {
  // El padre cambia la key en cada edición para recuperar la línea vigente.
  const [varianteId, setVarianteId] = useState(
    seleccionInicial?.varianteId == null ? '' : String(seleccionInicial.varianteId)
  )
  const [selecciones, setSelecciones] = useState(
    () => [...(seleccionInicial?.modificadoresIds ?? [])]
  )
  const [mensaje, setMensaje] = useState('')

  const { datos, error, pendiente } = useConsultaRemota(
    cargarConfiguracion,
    producto.id
  )

  const variantes = datos?.variantes ?? []
  const grupos = datos?.grupos ?? []
  const opcionesDisponibles = new Set(grupos.flatMap(grupo => grupo.opciones.map(opcion => opcion.id)))
  const opcionesRetiradas = selecciones.filter(id => !opcionesDisponibles.has(id))

  // Construir únicamente los datos permitidos en el borrador.
  // Conservar los identificadores seleccionados permite detectar
  // opciones que ya no pertenecen a la configuración recibida.
  const seleccion = {
    productoId: producto.id,
    varianteId: varianteId === '' ? null : Number(varianteId),
    modificadoresIds: selecciones,
    cantidad: seleccionInicial?.cantidad ?? 1
  }

  let estimacion = null
  let errorPrecio = ''

  // Compartir las reglas que también utilizaremos al recuperar
  // y editar líneas: producto activo, variante existente,
  // grupos obligatorios y opciones permitidas.
  if (datos) {
    try {
      estimacion = estimarSeleccionCarrito({
        producto,
        configuracion: datos,
        seleccion
      })
    } catch (error) {
      errorPrecio = error instanceof Error
        ? error.message
        : 'No se pudo validar la selección.'
    }
  }

  function cambiarOpcion(grupo, opcionId, marcada) {
    setMensaje('')

    setSelecciones(actual => {
      if (!marcada) return actual.filter(id => id !== opcionId)
      if (grupo.es_multiple) return [...new Set([...actual, opcionId])]
      // Sustituir solo la opción del grupo simple, conservando otros grupos.
      const idsDelGrupo = new Set(grupo.opciones.map(opcion => opcion.id))
      return [...actual.filter(id => !idsDelGrupo.has(id)), opcionId]
    })
  }

  function confirmar() {
    setMensaje('')

    // No aceptar selecciones mientras falta la configuración
    // o el componente está deshabilitado.
    if (deshabilitado || pendiente || error || !datos) {
      return
    }

    try {
      // Volver a validar justo antes de modificar el borrador.
      // El resultado monetario permanece únicamente en memoria.
      estimarSeleccionCarrito({
        producto,
        configuracion: datos,
        seleccion
      })

      onConfirmar(seleccion)

      setMensaje(seleccionInicial ? 'Selección actualizada.' : 'Selección añadida al borrador.')
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se pudo añadir la selección.'
      )
    }
  }

  return (
    <section className="vz-panel space-y-5 p-5">
      <h2 className="text-xl font-semibold">
        Configurar: {producto.nombre}
      </h2>

      {pendiente && (
        <p role="status">Cargando variantes y modificadores…</p>
      )}

      {error && <p role="alert">{error}</p>}

      {datos && (
        <>
          <fieldset
            className="space-y-5"
            disabled={deshabilitado || pendiente}
          >
            <legend className="sr-only">
              Opciones de {producto.nombre}
            </legend>

            <label className="block space-y-2">
              <span>Variante</span>

              <select
                className="vz-purchase-input"
                value={varianteId}
                onChange={evento => {
                  setVarianteId(evento.target.value)
                  setMensaje('')
                }}
              >
                <option value="">Presentación base</option>
                {varianteId !== '' && !variantes.some(variante => variante.id === Number(varianteId)) && (
                  <option value={varianteId}>Variante retirada · selecciona otra</option>
                )}

                {variantes.map(elemento => (
                  <option key={elemento.id} value={elemento.id}>
                    {elemento.nombre_variante}
                    {' · adicional S/ '}
                    {elemento.precio_adicional}
                  </option>
                ))}
              </select>
            </label>

            {/* Permitir corregir un borrador aunque hayan retirado sus extras. */}
            {opcionesRetiradas.length > 0 && (
              <div className="space-y-2">
                <p>Hay modificadores que ya no están disponibles.</p>
                <BotonBase onClick={() => {
                  setSelecciones(actual => actual.filter(id => opcionesDisponibles.has(id)))
                  setMensaje('')
                }}>Retirar opciones no disponibles</BotonBase>
              </div>
            )}

            {grupos.map(grupo => (
              <fieldset key={grupo.id} className="space-y-3">
                <legend className="font-semibold">
                  {grupo.nombre_grupo}
                  {grupo.es_obligatorio ? ' · Obligatorio' : ' · Opcional'}
                </legend>

                <p>
                  {grupo.es_multiple
                    ? 'Puedes seleccionar varias opciones.'
                    : 'Selecciona como máximo una opción.'}
                </p>

                {grupo.opciones.length === 0 && (
                  <p>Este grupo no tiene opciones disponibles.</p>
                )}

                {grupo.opciones.map(opcion => (
                  <label
                    key={opcion.id}
                    className="flex items-center gap-3"
                  >
                    {/* Usar casillas permite desmarcar también
                        la única opción de un grupo simple. */}
                    <input
                      type="checkbox"
                      checked={
                        selecciones.includes(opcion.id)
                      }
                      onChange={evento => cambiarOpcion(
                        grupo,
                        opcion.id,
                        evento.target.checked
                      )}
                    />

                    <span>
                      {opcion.nombre_modificador}
                      {opcion.es_exclusion ? ' · Exclusión' : ''}
                      {' · adicional S/ '}
                      {opcion.precio_adicional}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </fieldset>

          {errorPrecio && <p role="alert">{errorPrecio}</p>}

          {estimacion && (
            <p aria-live="polite">
              Precio unitario estimado: <strong>
                S/ {estimacion.precioUnitario}
              </strong>
            </p>
          )}

          <p className="vz-page-description">
            El servidor validará el precio y la disponibilidad
            al procesar el pedido.
          </p>

          <BotonBase
            disabled={
            deshabilitado ||
            pendiente ||
            Boolean(error) ||
            !datos ||
            Boolean(errorPrecio)
            }
            onClick={confirmar}
          >
            {textoConfirmar}
          </BotonBase>
        </>
      )}

      {mensaje && <p role="status">{mensaje}</p>}
    </section>
  )
}
