import { useState } from 'react'
import BotonBase from '../components/ui/BotonBase.jsx'
import SelectorProductoCarrito from '../components/carrito/SelectorProductoCarrito.jsx'
import ResumenCarrito from '../components/carrito/ResumenCarrito.jsx'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarProductos } from '../services/catalogo.service.js'
import { useAuthStore } from '../stores/auth.store.js'
import { useCartStore } from '../stores/useCartStore.js'

// Función estable para cancelar consultas obsoletas al cambiar de página.
function cargarProductos(solicitud, signal) {
  return consultarProductos({ ...solicitud, signal })
}

export default function PruebasCarrito() {
  const usuarioId = useAuthStore(s => s.usuario?.id)
  const preparado = useCartStore(s => s.carritoPreparado)
  const propietarioId = useCartStore(s => s.usuarioCarritoId)
  const aviso = useCartStore(s => s.avisoPersistencia)
  const [productoId, setProductoId] = useState('')
  const [repetirSeleccion, setRepetirSeleccion] = useState(false)
  const [solicitud, setSolicitud] = useState({ pagina: 1, limite: 20 })
  const [busqueda, setBusqueda] = useState('')
  const { datos, error, pendiente } = useConsultaRemota(cargarProductos, solicitud, { conservarDatos: true })
  const productos = datos?.productos ?? []
  const listo = preparado && propietarioId === usuarioId
  const seleccionado = productos.find(producto => producto.id === Number(productoId) && producto.estado === 'activo')

  function agregarSeleccion(seleccion) {
    const sesion = useAuthStore.getState()
    const carrito = useCartStore.getState()
    // Confirmar el propietario en el momento de escribir, no solo al renderizar.
    if (sesion.estado !== 'autenticado' || !carrito.carritoPreparado || carrito.usuarioCarritoId !== sesion.usuario?.id) {
      throw new Error('Espera a que se recupere tu carrito.')
    }
    if (!seleccionado || seleccion.productoId !== seleccionado.id) {
      throw new Error('Selecciona un producto activo.')
    }
    // El lote se valida completo y genera una sola actualización persistida.
    carrito.agregarLineas(Array.from({ length: repetirSeleccion ? 30 : 1 }, () => seleccion))
  }

  function cambiarPagina(desplazamiento) {
    setProductoId('')
    setSolicitud(actual => ({ ...actual, pagina: actual.pagina + desplazamiento }))
  }

  return (
    <section className="vz-page space-y-6">
      <header>
        <h1 className="vz-page-title">Pruebas del carrito</h1>
        <p className="vz-page-description">Borrador local de desarrollo. No genera ventas ni reserva stock.</p>
      </header>
      {!listo && <p role="status">Recuperando borrador…</p>}
      {aviso && <p role="alert">{aviso}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="vz-panel space-y-4 p-5">
        <form className="flex flex-wrap items-end gap-3" onSubmit={evento => {
          evento.preventDefault()
          setProductoId('')
          setSolicitud({ pagina: 1, limite: 20, busqueda: busqueda.trim() })
        }}>
          <label className="min-w-0 flex-1 space-y-2">
            <span>Buscar producto</span>
            <input className="vz-purchase-input" value={busqueda} maxLength={150}
              onChange={evento => setBusqueda(evento.target.value)} placeholder="Nombre, SKU o código de barras" />
          </label>
          <BotonBase type="submit" disabled={!listo}>Buscar</BotonBase>
        </form>
        <label className="block space-y-2">
          <span>Producto activo del catálogo</span>
          <select className="vz-purchase-input" value={productoId} disabled={!listo || pendiente || Boolean(error)}
            onChange={evento => setProductoId(evento.target.value)}>
            <option value="">Selecciona un producto</option>
            {productos.filter(producto => producto.estado === 'activo').map(producto => (
              <option key={producto.id} value={producto.id}>{producto.nombre}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <BotonBase disabled={pendiente || solicitud.pagina === 1} onClick={() => cambiarPagina(-1)}>Anterior</BotonBase>
          <span>Página {pendiente ? datos?.paginacion?.pagina ?? solicitud.pagina : solicitud.pagina}</span>
          <BotonBase disabled={pendiente || Boolean(error) || solicitud.pagina >= (datos?.paginacion?.totalPaginas ?? 1)}
            onClick={() => cambiarPagina(1)}>Siguiente</BotonBase>
          <BotonBase disabled={pendiente} onClick={() => setSolicitud(actual => ({ ...actual }))}>Reintentar consulta</BotonBase>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={repetirSeleccion} disabled={!listo}
            onChange={evento => setRepetirSeleccion(evento.target.checked)} />
          <span>Añadir 30 líneas iguales al confirmar la selección</span>
        </label>
      </div>
      {listo && seleccionado && !pendiente && !error && (
        <SelectorProductoCarrito key={`${propietarioId}:${seleccionado.id}`} producto={seleccionado} onConfirmar={agregarSeleccion} />
      )}
      {/* Desmontar el resumen al cambiar de sesión retira sus datos de la vista. */}
      {listo && <ResumenCarrito key={propietarioId} />}
    </section>
  )
}
