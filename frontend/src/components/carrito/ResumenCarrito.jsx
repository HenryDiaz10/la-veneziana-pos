import { useMemo, useState } from 'react'
import BotonBase from '../ui/BotonBase.jsx'
import Modal from '../ui/Modal.jsx'
import SelectorProductoCarrito from './SelectorProductoCarrito.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarDatosBorrador } from '../../services/carrito.service.js'
import { estimarBorrador } from '../../utils/carrito-estimacion.js'
import { useCartStore } from '../../stores/useCartStore.js'
import { useAuthStore } from '../../stores/auth.store.js'

// Resumen reutilizable: los datos del catálogo viven en la consulta, no en el store.
export default function ResumenCarrito() {
  const lineas = useCartStore(s => s.lineas)
  const [revision, setRevision] = useState(0)
  const [edicion, setEdicion] = useState(null)
  const [confirmarVaciado, setConfirmarVaciado] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  // Cambiar cantidades no vuelve a descargar el catálogo. Cambiar productos
  // o pulsar Actualizar precios sí inicia una consulta nueva y cancelable.
  const claveIds = [...new Set(lineas.map(linea => linea.productoId))].sort((a, b) => a - b).join(',')
  const solicitud = useMemo(() => ({
    ids: claveIds ? claveIds.split(',').map(Number) : [], revision
  }), [claveIds, revision])
  const { datos, error, pendiente } = useConsultaRemota(consultarDatosBorrador, solicitud)
  const resumen = datos ? estimarBorrador(lineas, datos) : null
  const lineaEditada = lineas.find(linea => linea.id === edicion)
  const productoEditado = lineaEditada ? datos?.[lineaEditada.productoId]?.producto : null

  function comprobarPropietario() {
    const sesion = useAuthStore.getState()
    const carrito = useCartStore.getState()
    if (sesion.estado !== 'autenticado' || !carrito.carritoPreparado ||
      carrito.usuarioCarritoId !== sesion.usuario?.id) {
      throw new Error('Espera a que se recupere tu carrito.')
    }
  }

  function ejecutar(accion) {
    setErrorAccion('')
    try { comprobarPropietario(); accion() }
    catch (error) { setErrorAccion(error.message) }
  }

  function guardarEdicion(seleccion) {
    comprobarPropietario()
    if (!lineaEditada || seleccion.productoId !== lineaEditada.productoId) {
      throw new Error('La línea que intentas editar ya no está disponible.')
    }
    useCartStore.getState().actualizarLinea(lineaEditada.id, seleccion)
    setEdicion(null)
    setRevision(actual => actual + 1)
  }

  return (
    <section className="vz-panel space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Borrador · {lineas.length} líneas</h2>
        <BotonBase disabled={pendiente} onClick={() => setRevision(actual => actual + 1)}>
          Actualizar precios
        </BotonBase>
      </div>
      {pendiente && <p role="status">Consultando los precios actuales…</p>}
      {error && <p role="alert">{error} Puedes reintentar con Actualizar precios.</p>}
      {errorAccion && <p role="alert">{errorAccion}</p>}
      {!lineas.length && <p>El borrador está vacío.</p>}

      <ul className="space-y-4">
        {lineas.map((linea, indice) => {
          const resultado = resumen?.resultados[indice]
          const producto = datos?.[linea.productoId]?.producto
          return (
            <li key={linea.id} className="space-y-3 border-b border-app-borde pb-4">
              <div className="min-w-0 space-y-1 break-words">
                <h3 className="font-semibold">{indice + 1}. {producto?.nombre ?? `Producto #${linea.productoId}`}</h3>
                {linea.indicaciones && <p className="break-words text-sm"><strong>Cocina:</strong> {linea.indicaciones}</p>}
                {resultado?.error ? <p role="alert">{resultado.error}</p> : resultado && (
                  <>
                    <p>{resultado.varianteNombre}</p>
                    <p>{resultado.modificadoresNombres.join(', ') || 'Sin modificadores'}</p>
                    <p>Unitario estimado: S/ {resultado.precioUnitario} · Importe: S/ {resultado.total}</p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <BotonBase aria-label={`Reducir cantidad de la línea ${indice + 1}`}
                  disabled={linea.cantidad <= 1} onClick={() => ejecutar(() =>
                    useCartStore.getState().actualizarLinea(linea.id, { cantidad: linea.cantidad - 1 }))}>−</BotonBase>
                <span>Cantidad: {linea.cantidad}</span>
                <BotonBase aria-label={`Aumentar cantidad de la línea ${indice + 1}`}
                  disabled={linea.cantidad >= 10000} onClick={() => ejecutar(() =>
                    useCartStore.getState().actualizarLinea(linea.id, { cantidad: linea.cantidad + 1 }))}>+</BotonBase>
                <BotonBase disabled={!producto || producto.estado !== 'activo' || pendiente}
                  aria-label={`Editar línea ${indice + 1}`} onClick={() => setEdicion(linea.id)}>Editar</BotonBase>
                <BotonBase aria-label={`Quitar línea ${indice + 1}`} onClick={() => ejecutar(() =>
                  useCartStore.getState().quitarLinea(linea.id))}>Quitar</BotonBase>
              </div>
            </li>
          )
        })}
      </ul>

      {resumen?.errorTotal && <p role="status">{resumen.errorTotal}</p>}
      {resumen?.total !== null && resumen?.total !== undefined && (
        <p className="text-xl font-semibold" aria-live="polite">Total estimado: S/ {resumen.total}</p>
      )}
      <p className="vz-page-description">Estimación sin reserva de stock. El importe definitivo y la disponibilidad
        los validará el servidor al registrar el pedido.</p>
      <BotonBase disabled={!lineas.length} onClick={() => setConfirmarVaciado(true)}>Vaciar borrador</BotonBase>

      {lineaEditada && productoEditado && (
        <Modal titulo="Editar línea del borrador" onCerrar={() => setEdicion(null)}>
          <SelectorProductoCarrito key={lineaEditada.id} producto={productoEditado}
            seleccionInicial={lineaEditada} textoConfirmar="Guardar cambios" onConfirmar={guardarEdicion} />
        </Modal>
      )}
      {confirmarVaciado && (
        <Modal titulo="Vaciar borrador" onCerrar={() => setConfirmarVaciado(false)}>
          <p className="mb-4">Se quitarán todas las líneas de este borrador.</p>
          <div className="flex flex-wrap gap-3">
            <BotonBase onClick={() => setConfirmarVaciado(false)}>Conservar borrador</BotonBase>
            <BotonBase onClick={() => ejecutar(() => {
              useCartStore.getState().vaciarCarrito()
              setConfirmarVaciado(false)
            })}>Confirmar vaciado</BotonBase>
          </div>
        </Modal>
      )}
    </section>
  )
}
