import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import Badge from '../ui/Badge.jsx'
import Icono from '../ui/Icono.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarProductoPos } from '../../services/pos.service.js'
import { obtenerFamiliaBebida } from '../../utils/bebidas-pos.js'
import { estimarSeleccionCarrito } from '../../utils/carrito-estimacion.js'
import IndicacionesProducto from '../carrito/IndicacionesProducto.jsx'

function cargarConfiguracion(productoId, signal) {
  return consultarProductoPos(productoId, { signal })
}

export default function ModalPersonalizarProducto({
  producto,
  nombreGrupo = null,
  presentaciones = null,
  onCambiarPresentacion = null,
  seleccionInicial = null,
  onConfirmar,
  onCerrar,
  deshabilitado = false
}) {
  const [varianteId, setVarianteId] = useState(
    seleccionInicial?.varianteId != null ? String(seleccionInicial.varianteId) : ''
  )
  const [selecciones, setSelecciones] = useState(
    () => [...(seleccionInicial?.modificadoresIds ?? [])]
  )
  const [cantidad, setCantidad] = useState(
    () => String(seleccionInicial?.cantidad ?? 1)
  )
  const [mensajeError, setMensajeError] = useState('')
  const [indicaciones, setIndicaciones] = useState(seleccionInicial?.indicaciones ?? '')

  // Consultar precios y opciones actuales, incluso al editar una línea guardada.
  const { datos, error, pendiente, reintentar } = useConsultaRemota(
    cargarConfiguracion,
    producto.id
  )

  const configuracion = datos?.configuracion
  const productoActual = datos?.producto ?? producto
  const variantes = configuracion?.variantes ?? []
  const grupos = configuracion?.grupos ?? []
  const varianteBase = variantes.find(v => v.precio_adicional === '0.00')
  const esBase = varianteId === '' || varianteId === String(varianteBase?.id)

  const opcionesDisponibles = new Set(
    grupos.flatMap(grupo => grupo.opciones.map(opcion => opcion.id))
  )
  const opcionesRetiradas = selecciones.filter(id => !opcionesDisponibles.has(id))

  const seleccionActual = {
    productoId: producto.id,
    varianteId: varianteId === '' ? null : Number(varianteId),
    modificadoresIds: selecciones,
    cantidad: /^\d+$/.test(cantidad) ? Number(cantidad) : NaN,
    indicaciones
  }

  let estimacion = null
  let errorRegla = ''

  if (configuracion) {
    try {
      estimacion = estimarSeleccionCarrito({
        producto: productoActual,
        configuracion,
        seleccion: seleccionActual
      })
    } catch (err) {
      errorRegla = err instanceof Error ? err.message : 'Selección no válida.'
    }
  }

  function cambiarOpcion(grupo, opcionId, marcada) {
    setMensajeError('')
    setSelecciones(actual => {
      if (!marcada) {
        return actual.filter(id => id !== opcionId)
      }
      if (grupo.es_multiple) {
        return [...new Set([...actual, opcionId])]
      }
      // Reemplazar la opción del grupo simple conservando las de otros grupos
      const idsDelGrupo = new Set(grupo.opciones.map(op => op.id))
      return [...actual.filter(id => !idsDelGrupo.has(id)), opcionId]
    })
  }

  function modificarCantidad(delta) {
    setCantidad(actual => {
      const nueva = (Number(actual) || 1) + delta
      return String(Math.max(1, Math.min(10000, Math.trunc(nueva))))
    })
  }

  function confirmar() {
    setMensajeError('')
    if (deshabilitado || pendiente || Boolean(error) || !configuracion || Boolean(errorRegla)) {
      return
    }

    try {
      // Revalidar inmediatamente antes de entregar la selección
      estimarSeleccionCarrito({
        producto: productoActual,
        configuracion,
        seleccion: seleccionActual
      })

      onConfirmar(seleccionActual)
      onCerrar()
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : 'Error al guardar selección.')
    }
  }

  const esEdicion = Boolean(seleccionInicial)
  const tituloModal = esEdicion
    ? `Editar: ${nombreGrupo ?? producto.nombre}`
    : `Personalizar: ${nombreGrupo ?? producto.nombre}`

  return (
    <Modal titulo={tituloModal} onCerrar={onCerrar}>
      <div className="pos-modal-content space-y-6">
        {/* Cabecera del producto */}
        <div className="flex items-start gap-4 border-b border-app-borde pb-4">
          <div className="size-16 shrink-0 rounded-xl overflow-hidden bg-app-elevada flex items-center justify-center">
            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                className={`w-full h-full ${producto.tipo_producto === 'producto_directo' ? 'object-contain bg-white' : 'object-cover'}`}
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="text-marca-dorado">
                <Icono nombre="pizza" className="size-8" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-titulo text-lg font-bold text-app-texto break-words">
              {producto.nombre}
            </h3>
            {producto.descripcion && (
              <p className="mt-1 text-xs text-app-secundario line-clamp-2">
                {producto.descripcion}
              </p>
            )}
            <p className="mt-2 text-sm font-semibold text-app-acento-texto">
              {presentaciones ? 'Precio de presentación' : 'Precio base'}: S/ {productoActual.precio_venta_base}
            </p>
          </div>
        </div>

        {/* Estados de carga y error de configuración */}
        {pendiente && (
          <div className="py-8 text-center" role="status">
            <span className="vz-empty-icon inline-flex animate-spin">
              <Icono nombre="actualizar" />
            </span>
            <p className="text-sm font-semibold">Cargando opciones y extras…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-app-borde bg-app-elevada p-4 text-center">
            <p role="alert" className="text-sm text-app-error mb-3">{error}</p>
            <BotonBase onClick={() => reintentar?.()}>
              Reintentar
            </BotonBase>
          </div>
        )}

        {/* Cada tamaño de bebida mantiene el ID real de su producto/insumo. */}
        {presentaciones && (
          <fieldset className="space-y-3">
            <legend className="flex flex-wrap items-center gap-2 font-titulo text-sm font-bold">
              Presentación / Tamaño <Badge>Requerido</Badge>
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {presentaciones.map(opcion => {
                const activa = opcion.id === producto.id
                const etiqueta = obtenerFamiliaBebida(opcion)?.presentacion ?? opcion.nombre
                return (
                  <label key={opcion.id} className={`flex min-h-14 min-w-0 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${activa ? 'border-marca-dorado bg-amber-500/10' : 'border-app-borde hover:bg-app-hover'}`}>
                    <span className="flex min-w-0 items-center gap-2 break-words text-sm font-semibold">
                      <input type="radio" name="presentacion-bebida" value={opcion.id}
                        checked={activa} onChange={() => onCambiarPresentacion(opcion.id)} className="accent-marca-dorado" />
                      {etiqueta}
                    </span>
                    <span className="break-all font-mono text-sm font-bold text-app-acento-texto">
                      S/ {activa && datos ? productoActual.precio_venta_base : opcion.precio_venta_base}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {configuracion && (
          <div className="space-y-6">
            {/* Opciones retiradas (caso de borrador rehidratado con extras eliminados) */}
            {opcionesRetiradas.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-app-acento-texto flex items-center justify-between gap-3">
                <p>Hay opciones seleccionadas que ya no están disponibles.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelecciones(actual => actual.filter(id => opcionesDisponibles.has(id)))
                  }}
                  className="font-bold underline hover:no-underline"
                >
                  Retirar
                </button>
              </div>
            )}

            {/* Los envases ya expresan el tamaño; evitar una opción base duplicada. */}
            {(!presentaciones || variantes.length > 0) && <fieldset className="space-y-3">
              <legend className="font-titulo text-sm font-bold text-app-texto flex items-center gap-2">
                <span>Presentación / Tamaño</span>
                <Badge variante="neutro">Requerido</Badge>
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Opción base */}
                <label
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    esBase
                      ? 'border-marca-dorado bg-amber-500/10 font-semibold'
                      : 'border-app-borde bg-app-superficie hover:bg-app-hover'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <input
                      type="radio"
                      name="variante-pos"
                      value=""
                      checked={esBase}
                      onChange={() => setVarianteId(varianteBase ? String(varianteBase.id) : '')}
                      className="accent-marca-dorado"
                    />
                    <span className="text-sm">
                      {varianteBase?.nombre_variante ?? 'Presentación base'}
                      {' (precio base)'}
                    </span>
                  </div>
                  <span className="text-xs text-app-secundario">+ S/ 0.00</span>
                </label>

                {/* Variantes del producto */}
                {variantes.filter(v => v.id !== varianteBase?.id).map(v => {
                  const activa = varianteId === String(v.id)
                  return (
                    <label
                      key={v.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        activa
                          ? 'border-marca-dorado bg-amber-500/10 font-semibold'
                          : 'border-app-borde bg-app-superficie hover:bg-app-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="radio"
                          name="variante-pos"
                          value={String(v.id)}
                          checked={activa}
                          onChange={() => setVarianteId(String(v.id))}
                          className="accent-marca-dorado"
                        />
                        <span className="text-sm break-words min-w-0">{v.nombre_variante}</span>
                      </div>
                      <span className="text-xs font-semibold text-app-acento-texto shrink-0 ml-2">
                        + S/ {v.precio_adicional}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>}

            {/* Grupos de Modificadores (Extras, Bordes, Exclusiones, etc.) */}
            {grupos.map(grupo => {
              const esObligatorio = grupo.es_obligatorio
              const esMultiple = grupo.es_multiple
              const idsDelGrupo = new Set(grupo.opciones.map(o => o.id))
              const seleccionadosEnGrupo = selecciones.filter(id => idsDelGrupo.has(id))
              const cumplido = !esObligatorio || seleccionadosEnGrupo.length > 0

              return (
                <fieldset key={grupo.id} className="space-y-3 border-t border-app-borde pt-4">
                  <legend className="w-full flex flex-wrap gap-2 items-center justify-between font-titulo text-sm font-bold text-app-texto">
                    <span className="min-w-0 break-words flex flex-wrap items-center gap-2">
                      {grupo.nombre_grupo}
                      <Badge variante={esObligatorio ? (cumplido ? 'exito' : 'advertencia') : 'neutro'}>
                        {esObligatorio ? 'Obligatorio' : 'Opcional'}
                      </Badge>
                    </span>
                    <span className="text-xs font-normal text-app-secundario">
                      {esMultiple ? 'Múltiples opciones' : 'Elige 1 opción'}
                    </span>
                  </legend>

                  {grupo.opciones.length === 0 ? (
                    <p className="text-xs text-app-secundario italic">No hay opciones disponibles en este grupo.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grupo.opciones.map(opcion => {
                        const seleccionada = selecciones.includes(opcion.id)
                        return (
                          <label
                            key={opcion.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              seleccionada
                                ? 'border-marca-dorado bg-amber-500/10 font-semibold'
                                : 'border-app-borde bg-app-superficie hover:bg-app-hover'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type={esObligatorio && !esMultiple ? 'radio' : 'checkbox'}
                                name={`grupo-pos-${grupo.id}`}
                                checked={seleccionada}
                                onChange={e => cambiarOpcion(grupo, opcion.id, e.target.checked)}
                                className="size-4 rounded accent-marca-dorado"
                              />
                              <span className="text-sm break-words min-w-0">
                                {opcion.nombre_modificador}
                                {opcion.es_exclusion && (
                                  <span className="ml-1 text-xs text-app-error font-normal">(Exclusión)</span>
                                )}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-app-acento-texto shrink-0 ml-2">
                              {Number(opcion.precio_adicional) > 0
                                ? `+ S/ ${opcion.precio_adicional}`
                                : 'Sin costo'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </fieldset>
              )
            })}

            <IndicacionesProducto valor={indicaciones} onChange={setIndicaciones} disabled={deshabilitado}/>

            {/* Selector de Cantidad */}
            <div className="border-t border-app-borde pt-4 flex flex-wrap items-center justify-between gap-4">
              <label htmlFor="cantidad-producto-pos" className="font-titulo text-sm font-bold text-app-texto">
                Cantidad a preparar
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Disminuir cantidad"
                  disabled={cantidad <= 1}
                  onClick={() => modificarCantidad(-1)}
                  className="size-10 rounded-xl border border-app-borde bg-app-elevada flex items-center justify-center font-bold text-lg hover:bg-app-hover disabled:opacity-40"
                >
                  −
                </button>
                <input
                  id="cantidad-producto-pos"
                  type="text"
                  inputMode="numeric"
                  aria-invalid={Boolean(errorRegla)}
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  className="w-16 h-10 text-center font-bold font-mono rounded-xl border border-app-borde bg-app-superficie text-app-texto"
                />
                <button
                  type="button"
                  aria-label="Aumentar cantidad"
                  disabled={cantidad >= 10000}
                  onClick={() => modificarCantidad(1)}
                  className="size-10 rounded-xl border border-app-borde bg-app-elevada flex items-center justify-center font-bold text-lg hover:bg-app-hover disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {/* Aviso de error de reglas o validación */}
            {(errorRegla || mensajeError) && (
              <p role="alert" className="rounded-xl border border-app-error/30 bg-app-error/10 p-3 text-xs text-app-error font-medium">
                {errorRegla || mensajeError}
              </p>
            )}

            {/* Resumen de Importes Estimados */}
            {estimacion && (
              <div className="rounded-xl border border-app-borde bg-app-elevada p-4 space-y-1 text-sm">
                <div className="flex justify-between text-app-secundario">
                  <span>Unitario estimado:</span>
                  <span className="font-mono font-bold text-app-texto">S/ {estimacion.precioUnitario}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-between text-base font-bold text-app-texto pt-1 border-t border-app-borde">
                  <span>Subtotal estimado ({cantidad} {Number(cantidad) === 1 ? 'unidad' : 'unidades'}):</span>
                  <span className="min-w-0 break-all font-mono text-app-acento-texto text-lg">S/ {estimacion.total}</span>
                </div>
                <p className="text-[11px] text-app-secundario mt-1">
                  Importe estimado. El precio final y la disponibilidad se validan en el servidor al registrar el pedido.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botones de acción del Modal */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-app-borde">
          <BotonSecundario onClick={onCerrar}>
            Cancelar
          </BotonSecundario>
          <BotonBase
            disabled={
              deshabilitado ||
              pendiente ||
              Boolean(error) ||
              !configuracion ||
              Boolean(errorRegla)
            }
            onClick={confirmar}
          >
            {esEdicion ? 'Guardar cambios' : 'Añadir al pedido'}
          </BotonBase>
        </div>
      </div>
    </Modal>
  )
}
