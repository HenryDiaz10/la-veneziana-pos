import { useMemo, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import BotonPeligro from '../ui/BotonPeligro.jsx'
import Badge from '../ui/Badge.jsx'
import Icono from '../ui/Icono.jsx'
import ModalPersonalizarProducto from './ModalPersonalizarProducto.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarDatosBorradorPos } from '../../services/pos.service.js'
import { estimarBorrador } from '../../utils/carrito-estimacion.js'
import { useCartStore } from '../../stores/useCartStore.js'
import { useAuthStore } from '../../stores/auth.store.js'

export default function ReciboTermico() {
  const lineas = useCartStore(s => s.lineas)
  const usuario = useAuthStore(s => s.usuario)
  const [revision, setRevision] = useState(0)
  const [edicionId, setEdicionId] = useState(null)
  const [confirmarVaciado, setConfirmarVaciado] = useState(false)
  const [modalCobroFase28, setModalCobroFase28] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [metodoPagoAuditado, setMetodoPagoAuditado] = useState('EFECTIVO')

  // Obtener IDs de productos únicos de las líneas del borrador
  const claveIds = useMemo(() => {
    return [...new Set(lineas.map(l => l.productoId))].sort((a, b) => a - b).join(',')
  }, [lineas])

  const solicitud = useMemo(() => ({
    ids: claveIds ? claveIds.split(',').map(Number) : [],
    revision
  }), [claveIds, revision])

  // Consultar precios y configuraciones con las rutas operativas protegidas por ventas/cobrar
  const { datos, error, pendiente, reintentar } = useConsultaRemota(
    consultarDatosBorradorPos,
    solicitud
  )

  const resumen = datos ? estimarBorrador(lineas, datos) : null
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

  function guardarEdicion(seleccion) {
    comprobarPropietario()
    if (!lineaEditada || seleccion.productoId !== lineaEditada.productoId) {
      throw new Error('La línea que intentas modificar ya no está disponible.')
    }
    useCartStore.getState().actualizarLinea(lineaEditada.id, seleccion)
    setEdicionId(null)
    setRevision(r => r + 1)
  }

  const cantidadTotalArticulos = lineas.reduce((total, l) => total + l.cantidad, 0)

  return (
    <section aria-labelledby="titulo-recibo-pos" className="pos-receipt">
      {/* Cabecera del Recibo Térmico */}
      <header className="pos-receipt-header">
        <p className="text-[10px] tracking-widest font-black uppercase text-marca-dorado">
          Pizzería La Veneziana
        </p>
        <h2 id="titulo-recibo-pos" className="font-titulo text-lg font-bold text-app-texto mt-1">
          TICKET DE PEDIDO
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-app-secundario">
          <span>Cajero: <strong>{usuario?.nombre_completo || usuario?.nombre || 'Operador'}</strong></span>
          <span>•</span>
          <span>Borrador activo</span>
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
              onClick={() => {
                setRevision(r => r + 1)
                reintentar?.()
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-app-borde text-xs font-semibold text-app-texto hover:bg-app-hover disabled:opacity-40 transition-colors"
              title="Consultar precios actuales"
            >
              <Icono nombre="actualizar" className={`size-3.5 ${pendiente ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {lineas.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmarVaciado(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs font-semibold text-app-error hover:bg-red-500/10 transition-colors"
                title="Vaciar todo el borrador"
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
                      {resultado?.modificadoresNombres?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {resultado.modificadoresNombres.map((modNombre, mIdx) => (
                            <span
                              key={mIdx}
                              className="inline-block text-[11px] px-2 py-0.5 rounded bg-app-elevada border border-app-borde text-app-secundario"
                            >
                              + {modNombre}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Aviso de error en la línea */}
                      {tieneError && (
                        <p role="alert" className="text-xs text-app-error font-medium mt-1">
                          {resultado.error}
                        </p>
                      )}
                    </div>

                    {/* Precios de la línea */}
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-app-texto block">
                        {resultado?.total ? `S/ ${resultado.total}` : 'S/ --.--'}
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
                        className="size-7 rounded flex items-center justify-center font-bold text-sm text-app-texto hover:bg-app-hover disabled:opacity-30"
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
                        className="size-7 rounded flex items-center justify-center font-bold text-sm text-app-texto hover:bg-app-hover disabled:opacity-30"
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
                        className="px-2.5 py-1 rounded-lg border border-app-borde text-xs font-semibold text-app-texto hover:bg-app-hover disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Quitar línea ${index + 1}`}
                        onClick={() =>
                          ejecutar(() => useCartStore.getState().quitarLinea(linea.id))
                        }
                        className="px-2.5 py-1 rounded-lg border border-red-500/20 text-xs font-semibold text-app-error hover:bg-red-500/10"
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

        {/* Subtotales y Total Estimado */}
        <div className="space-y-1.5 text-xs text-app-secundario">
          <div className="flex justify-between">
            <span>Subtotal estimado:</span>
            <span className="font-mono font-semibold text-app-texto">
              {resumen?.total !== null && resumen?.total !== undefined
                ? `S/ ${resumen.total}`
                : 'S/ --.--'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>IGV estimado (18% incluido):</span>
            <span className="font-mono font-semibold text-app-texto">
              {resumen?.total !== null && resumen?.total !== undefined
                ? `S/ ${(Number(resumen.total) * 0.18 / 1.18).toFixed(2)}`
                : 'S/ 0.00'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-app-borde">
            <span className="font-titulo text-sm font-bold text-app-texto">
              TOTAL ESTIMADO:
            </span>
            <span
              className="font-mono text-2xl font-black text-marca-dorado tracking-tight"
              aria-live="polite"
            >
              {resumen?.total !== null && resumen?.total !== undefined
                ? `S/ ${resumen.total}`
                : 'S/ 0.00'}
            </span>
          </div>
        </div>

        {/* Cuadrícula de Métodos de Pago Auditados (Preparación de referencia para Fase 28/29) */}
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-app-secundario block mb-1.5">
            Método de cobro (auditoría):
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN'].map(metodo => (
              <button
                key={metodo}
                type="button"
                onClick={() => setMetodoPagoAuditado(metodo)}
                className={`pos-payment-pill ${metodoPagoAuditado === metodo ? 'is-active' : ''}`}
              >
                {metodo}
              </button>
            ))}
          </div>
        </div>

        {/* Nota informativa de límites entre fases */}
        <p className="text-[11px] text-app-secundario leading-relaxed">
          Los precios son estimados y no reservan stock. El cobro transaccional, comprobante fiscal y registro del pedido corresponden a la Fase 28.
        </p>

        {/* Botón Maestro de Cobro (Límite Fase 27 / Fase 28) */}
        <button
          type="button"
          disabled={lineas.length === 0 || Boolean(resumen?.errorTotal)}
          onClick={() => setModalCobroFase28(true)}
          className="w-full min-h-12 py-3.5 px-4 rounded-xl font-titulo font-bold text-sm tracking-wide bg-marca-dorado text-texto hover:bg-amber-400 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icono nombre="compras" className="size-5" />
          <span>Continuar al cobro · S/ {resumen?.total || '0.00'}</span>
        </button>
      </footer>

      {/* Modal de Edición de Línea */}
      {lineaEditada && configuracionEditada?.producto && (
        <ModalPersonalizarProducto
          key={lineaEditada.id}
          producto={configuracionEditada.producto}
          configuracionPrevia={configuracionEditada.configuracion}
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

      {/* Modal Informativo del Límite de Fase 27 / Fase 28 */}
      {modalCobroFase28 && (
        <Modal titulo="Revisión de Pedido (Fase 27)" onCerrar={() => setModalCobroFase28(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-marca-dorado/30 bg-amber-500/10 p-4">
              <h4 className="font-titulo text-sm font-bold text-app-acento-texto flex items-center gap-2">
                <Icono nombre="estado" className="size-4" />
                Interfaz operativa del POS lista
              </h4>
              <p className="mt-2 text-xs text-app-texto leading-relaxed">
                Has configurado exitosamente un pedido de <strong>{lineas.length} líneas</strong> con un importe total estimado de <strong>S/ {resumen?.total}</strong> y método auditado <strong>{metodoPagoAuditado}</strong>.
              </p>
            </div>

            <p className="text-xs text-app-secundario leading-relaxed">
              De acuerdo con la arquitectura del sistema:
            </p>
            <ul className="text-xs text-app-secundario list-disc pl-5 space-y-1">
              <li><strong>Fase 27 (Actual):</strong> Diseño arquitectónico del POS, catálogo operativo, selección de variantes y modificadores, recibo térmico, estimación y persistencia local del borrador.</li>
              <li><strong>Fase 28 (Siguiente):</strong> Creación transaccional del pedido (`pedidos_master`), envío a cocina KDS, apertura de caja y cobro formal.</li>
              <li><strong>Fase 29 y 30:</strong> Pagos mixtos divididos, vuelto e impresión térmica de tickets con agente ESC/POS.</li>
            </ul>

            <div className="flex justify-end pt-3 border-t border-app-borde">
              <BotonBase onClick={() => setModalCobroFase28(false)}>
                Entendido, continuar operando
              </BotonBase>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
