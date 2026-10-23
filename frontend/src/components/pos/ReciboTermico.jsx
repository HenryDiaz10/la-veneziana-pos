import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import BotonPeligro from '../ui/BotonPeligro.jsx'
import Badge from '../ui/Badge.jsx'
import Icono from '../ui/Icono.jsx'
import ModalBebidaPos from './ModalBebidaPos.jsx'
import { obtenerFamiliaBebida } from '../../utils/bebidas-pos.js'
import ModalPersonalizarProducto from './ModalPersonalizarProducto.jsx'
import ResumenModificadores from '../carrito/ResumenModificadores.jsx'
import { useCartStore } from '../../stores/useCartStore.js'
import { useAuthStore } from '../../stores/auth.store.js'

export default function ReciboTermico({ consulta, registrado = false }) {
  const lineas = useCartStore(s => s.lineas)
  const usuario = useAuthStore(s => s.usuario)
  const [edicionId, setEdicionId] = useState(null)
  const [confirmarVaciado, setConfirmarVaciado] = useState(false)
  const [mostrarRevision, setMostrarRevision] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  // La misma estimación alimenta el resumen móvil y este recibo.
  const { datos, error, pendiente, reintentar, resumen } = consulta
  const totalDisponible = !pendiente && !error && resumen?.total != null && !resumen.errorTotal
  const lineaEditada = lineas.find(l => l.id === edicionId)
  const configuracionEditada = lineaEditada ? datos?.[lineaEditada.productoId] : null

  function comprobarPropietario() {
    const sesion = useAuthStore.getState()
    const carrito = useCartStore.getState()
    if (
      sesion.estado !== 'autenticado' ||
      !carrito.carritoPreparado ||
      carrito.usuarioCarritoId !== sesion.usuario?.id
    ) {
      throw new Error('Espera a que se recupere la sesión de tu borrador.')
    }
  }

  function ejecutar(accion) {
    setErrorAccion('')
    try {
      comprobarPropietario()
      accion()
    } catch (err) {
      setErrorAccion(err.message)
    }
  }

  function guardarEdicion(seleccion, productoDestino = null) {
    comprobarPropietario()
    const origen = obtenerFamiliaBebida(configuracionEditada?.producto)
    const destino = obtenerFamiliaBebida(productoDestino)
    const cambioDeEnvase = origen && destino?.clave === origen.clave && productoDestino.id === seleccion.productoId
    if (!lineaEditada || (seleccion.productoId !== lineaEditada.productoId && !cambioDeEnvase)) {
      throw new Error('La línea que intentas modificar ya no está disponible.')
    }
    useCartStore.getState().actualizarLinea(lineaEditada.id, seleccion)
    setEdicionId(null)
    reintentar()
  }

  const ModalEdicion = obtenerFamiliaBebida(configuracionEditada?.producto) ? ModalBebidaPos : ModalPersonalizarProducto

  const cantidadTotalArticulos = lineas.reduce((total, l) => total + l.cantidad, 0)

  return (
    <section aria-labelledby="titulo-recibo-pos" className="pos-receipt">
      {/* Cabecera del Recibo Térmico */}
      <header className="pos-receipt-header">
        <p className="text-[10px] tracking-widest font-black uppercase text-marca-dorado">
          Pizzería La Veneziana
        </p>
        <h2 id="titulo-recibo-pos" className="font-titulo text-lg font-bold text-app-texto mt-1">
          {registrado ? 'BORRADOR REGISTRADO' : 'BORRADOR DE PEDIDO'}
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-app-secundario">
          <span>Cajero: <strong>{usuario?.nombre_completo || usuario?.nombre || 'Operador'}</strong></span>
          <span>•</span>
          <span>{registrado ? 'Pendiente de cobro' : 'Borrador activo'}</span>
        </div>

        {/* Barra de control de líneas y actualización */}
        <div className="mt-4 pt-3 border-t border-dashed border-app-borde flex items-center justify-between gap-2">
          <Badge variante="exito">
            {lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'} · {cantidadTotalArticulos} art.
          </Badge>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pendiente || lineas.length === 0}
              onClick={reintentar}
              className="min-h-11 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-app-borde text-xs font-semibold text-app-texto hover:bg-app-hover disabled:opacity-40 transition-colors"
              title="Consultar precios actuales"
              aria-label="Actualizar"
            >
              <Icono nombre="actualizar" className={`size-3.5 ${pendiente ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {lineas.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmarVaciado(true)}
                className="min-h-11 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs font-semibold text-app-error hover:bg-red-500/10 transition-colors"
                title="Vaciar todo el borrador"
                aria-label="Vaciar"
              >
                <Icono nombre="eliminar" className="size-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Estados de consulta de precios del borrador */}
      {pendiente && (
        <div className="p-3 bg-amber-500/10 text-center text-xs text-app-acento-texto font-medium flex items-center justify-center gap-2" role="status">
          <Icono nombre="actualizar" className="size-3.5 animate-spin" />
          <span>Verificando precios y disponibilidad en el servidor…</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 text-center text-xs text-app-error font-medium" role="alert">
          {error} Puedes reintentar con el botón Actualizar.
        </div>
      )}

      {errorAccion && (
        <div className="p-3 bg-red-500/10 text-center text-xs text-app-error font-medium" role="alert">
          {errorAccion}
        </div>
      )}

      {/* Cuerpo del Recibo: Lista de Ítems */}
      <div className="pos-receipt-items">
        {lineas.length === 0 ? (
          <div className="py-16 text-center text-app-secundario">
            <span className="vz-empty-icon opacity-60">
              <Icono nombre="carrito" />
            </span>
            <p className="font-semibold text-sm text-app-texto">El pedido está vacío</p>
            <p className="mt-1 text-xs">Selecciona productos de la carta para empezar a armar la venta.</p>
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-app-borde">
            {lineas.map((linea, index) => {
              const resultado = resumen?.resultados[index]
              const productoInfo = datos?.[linea.productoId]?.producto
              const tieneError = Boolean(resultado?.error)

              return (
                <li key={linea.id} className="pos-receipt-line space-y-2">
                  {/* Encabezado de la línea: Número, Nombre y Total de línea */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-app-texto leading-snug break-words">
                        <span className="text-marca-dorado mr-1 font-mono">{index + 1}.</span>
                        {productoInfo?.nombre || `Producto #${linea.productoId}`}
                      </h4>

                      {/* Nombre de la variante si no es base */}
                      {resultado?.varianteNombre && (
                        <p className="text-xs font-semibold text-app-secundario mt-0.5">
                          {resultado.varianteNombre}
                        </p>
                      )}

                      {/* Modificadores / Extras / Exclusiones */}
                      <ResumenModificadores opciones={resultado?.modificadoresDetalle}/>

                      {linea.indicaciones && <p className="mt-2 break-words rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs"><strong>Cocina:</strong> {linea.indicaciones}</p>}

                      {/* Aviso de error en la línea */}
                      {tieneError && (
                        <p role="alert" className="text-xs text-app-error font-medium mt-1">
                          {resultado.error}
                        </p>
                      )}
                    </div>

                    {/* Precios de la línea */}
                    <div className="text-right min-w-0 max-w-[48%] break-all">
                      <span className="font-mono font-bold text-sm text-app-texto block">
                        {resultado?.total != null ? `S/ ${resultado.total}` : 'Pendiente'}
                      </span>
                      {resultado?.precioUnitario && (
                        <span className="text-[11px] font-mono text-app-secundario block">
                          u: S/ {resultado.precioUnitario}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones y Cantidad */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* Control de Cantidad (+ / -) */}
                    <div className="inline-flex items-center rounded-lg border border-app-borde bg-app-elevada p-0.5">
                      <button
                        type="button"
                        aria-label={`Disminuir cantidad de línea ${index + 1}`}
                        disabled={linea.cantidad <= 1}
                        onClick={() =>
                          ejecutar(() =>
                            useCartStore.getState().actualizarLinea(linea.id, {
                              cantidad: linea.cantidad - 1
                            })
                          )
                        }
                        className="size-11 rounded flex items-center justify-center font-bold text-sm text-app-texto hover:bg-app-hover disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-xs text-app-texto">
                        {linea.cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar cantidad de línea ${index + 1}`}
                        disabled={linea.cantidad >= 10000}
                        onClick={() =>
                          ejecutar(() =>
                            useCartStore.getState().actualizarLinea(linea.id, {
                              cantidad: linea.cantidad + 1
                            })
                          )
                        }
                        className="size-11 rounded flex items-center justify-center font-bold text-sm text-app-texto hover:bg-app-hover disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    {/* Acciones Editar y Quitar */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Editar línea ${index + 1}`}
                        disabled={!productoInfo || pendiente}
                        onClick={() => setEdicionId(linea.id)}
                        className="min-h-11 px-2.5 py-1 rounded-lg border border-app-borde text-xs font-semibold text-app-texto hover:bg-app-hover disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Quitar línea ${index + 1}`}
                        onClick={() =>
                          ejecutar(() => useCartStore.getState().quitarLinea(linea.id))
                        }
                        className="min-h-11 px-2.5 py-1 rounded-lg border border-red-500/20 text-xs font-semibold text-app-error hover:bg-red-500/10"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pie del Recibo: Desglose Financiero y Cobro */}
      <footer className="pos-receipt-footer space-y-4">
        {/* Error general de cálculo del total */}
        {resumen?.errorTotal && (
          <p role="alert" className="rounded-xl border border-app-error/30 bg-app-error/10 p-2.5 text-xs text-app-error font-medium">
            {resumen.errorTotal}
          </p>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-app-borde pt-2">
          <span className="font-bold text-sm">TOTAL ESTIMADO:</span>
          <span className="min-w-0 break-all font-mono text-2xl font-black text-app-acento-texto" aria-live="polite">
            {totalDisponible ? `S/ ${resumen.total}` : pendiente ? 'Verificando…' : 'No disponible'}
          </span>
        </div>
        <p className="text-xs text-app-secundario">
          {registrado ? 'Pedido registrado. Continúa su cobro desde el enlace superior.' : 'Borrador sin reserva de stock. No se ha registrado un pedido ni realizado un cobro.'}
        </p>
        <BotonSecundario className="w-full" disabled={!lineas.length || !totalDisponible} onClick={() => setMostrarRevision(true)}>
          Revisar borrador
        </BotonSecundario>
      </footer>

      {/* Modal de Edición de Línea */}
      {lineaEditada && configuracionEditada?.producto && (
        <ModalEdicion
          key={lineaEditada.id}
          producto={configuracionEditada.producto}
          seleccionInicial={lineaEditada}
          onConfirmar={guardarEdicion}
          onCerrar={() => setEdicionId(null)}
        />
      )}

      {/* Modal de Confirmación de Vaciado */}
      {confirmarVaciado && (
        <Modal titulo="Vaciar borrador de venta" onCerrar={() => setConfirmarVaciado(false)}>
          <div className="space-y-4">
            <p className="text-sm text-app-secundario">
              ¿Estás seguro de quitar las <strong>{lineas.length}</strong> líneas de este pedido?
              Esta acción limpiará el borrador actual en memoria y almacenamiento local.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-app-borde">
              <BotonSecundario onClick={() => setConfirmarVaciado(false)}>
                Conservar pedido
              </BotonSecundario>
              <BotonPeligro
                onClick={() =>
                  ejecutar(() => {
                    useCartStore.getState().vaciarCarrito()
                    setConfirmarVaciado(false)
                  })
                }
              >
                Confirmar vaciado
              </BotonPeligro>
            </div>
          </div>
        </Modal>
      )}

      {/* Revisión informativa: todavía no crea pedidos ni registra pagos. */}
      {mostrarRevision && (
        <Modal titulo="Revisión del borrador" onCerrar={() => setMostrarRevision(false)}>
          <div className="space-y-4">
            <p>{lineas.length} líneas · {cantidadTotalArticulos} artículos</p>
            {/* Revisar cada preparación antes de la futura confirmación del pedido. */}
            <ol className="space-y-3" aria-label="Preparaciones del borrador">
              {lineas.map(linea => {
                const detalle = resumen?.resultados.find(r => r.id === linea.id)
                return <li key={linea.id} className="break-words rounded-xl border border-app-borde p-3 text-sm">
                  <p className="font-bold">{linea.cantidad} × {datos?.[linea.productoId]?.producto.nombre ?? `Producto #${linea.productoId}`}</p>
                  {detalle?.varianteNombre && <p>{detalle.varianteNombre}</p>}
                  <ResumenModificadores opciones={detalle?.modificadoresDetalle}/>
                  {linea.indicaciones && <p className="mt-2"><strong>Cocina:</strong> {linea.indicaciones}</p>}
                  {detalle?.error && <p className="text-app-error">{detalle.error}</p>}
                </li>
              })}
            </ol>
            <p className="break-all font-bold" role="status">
              Total estimado: {totalDisponible ? `S/ ${resumen.total}` : 'No disponible'}
            </p>
            <p className="text-sm text-app-secundario">
              No se ha registrado un pedido ni realizado un cobro. Puedes volver al borrador para revisar sus selecciones.
            </p>
            <BotonBase onClick={() => setMostrarRevision(false)}>Volver al borrador</BotonBase>
          </div>
        </Modal>
      )}
    </section>
  )
}
