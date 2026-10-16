import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icono from '../components/ui/Icono.jsx'
import CatalogoPos from '../components/pos/CatalogoPos.jsx'
import ReciboTermico from '../components/pos/ReciboTermico.jsx'
import ModalPersonalizarProducto from '../components/pos/ModalPersonalizarProducto.jsx'
import BarraMovilPedido from '../components/pos/BarraMovilPedido.jsx'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarCatalogoPos } from '../services/pos.service.js'
import { useCartStore } from '../stores/useCartStore.js'
import { useAuthStore } from '../stores/auth.store.js'

export default function PuntoVenta() {
  const usuario = useAuthStore(s => s.usuario)
  const lineas = useCartStore(s => s.lineas)
  const carritoPreparado = useCartStore(s => s.carritoPreparado)
  const usuarioCarritoId = useCartStore(s => s.usuarioCarritoId)
  const avisoPersistencia = useCartStore(s => s.avisoPersistencia)

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [productoPersonalizando, setProductoPersonalizando] = useState(null)
  const [vistaMovil, setVistaMovil] = useState('catalogo')
  const [mensajeNotificacion, setMensajeNotificacion] = useState('')

  // En desarrollo, exponer referencia para comprobación automatizada de navegador
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      window.__useCartStore = useCartStore
    }
  }, [])

  // Solicitud estable para el hook de consulta remota
  const solicitudCatalogo = useMemo(() => ({
    categoriaId: categoriaSeleccionada,
    busqueda: busqueda.trim()
  }), [categoriaSeleccionada, busqueda])

  const cargarCatalogo = useCallback((solicitud, signal) => {
    return consultarCatalogoPos({ ...solicitud, signal })
  }, [])

  const { datos, error, pendiente, reintentar } = useConsultaRemota(
    cargarCatalogo,
    solicitudCatalogo
  )

  const categorias = datos?.categorias ?? []
  const productos = datos?.productos ?? []

  // Confirmar que el borrador pertenece al cajero autenticado
  const listoParaOperar = carritoPreparado && usuarioCarritoId === usuario?.id

  function agregarSeleccion(seleccion) {
    const sesion = useAuthStore.getState()
    const carrito = useCartStore.getState()

    if (
      sesion.estado !== 'autenticado' ||
      !carrito.carritoPreparado ||
      carrito.usuarioCarritoId !== sesion.usuario?.id
    ) {
      throw new Error('Espera a que se recupere la sesión de tu borrador.')
    }

    carrito.agregarLinea(seleccion)
    setMensajeNotificacion(`Añadido: ${productoPersonalizando?.nombre || 'Producto'}`)
    setTimeout(() => {
      setMensajeNotificacion('')
    }, 3000)
  }

  // Métricas para la barra móvil
  const articulosCount = useMemo(() => {
    return lineas.reduce((total, l) => total + l.cantidad, 0)
  }, [lineas])

  return (
    <section aria-labelledby="titulo-pos" className="vz-page pos-container pb-20 lg:pb-8">
      {/* Encabezado de la Página POS */}
      <header className="vz-page-header">
        <div>
          <p className="vz-kicker">
            <Icono nombre="pizza" className="size-3.5" />
            La Veneziana · Ventas y Caja
          </p>
          <h1 id="titulo-pos" className="vz-page-title">
            Punto de venta
          </h1>
          <p className="vz-page-description">
            Terminal operativo de pedidos. Registra y personaliza selecciones en el borrador en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/inicio"
            className="vz-button inline-flex min-h-11 items-center gap-2 border border-app-borde bg-app-superficie px-4 py-2.5 font-semibold text-app-texto hover:bg-app-hover transition-colors"
          >
            <Icono nombre="inicio" className="size-4" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </header>

      {/* Avisos de recuperación o persistencia del borrador */}
      {!listoParaOperar && (
        <div className="rounded-xl border border-app-borde bg-app-elevada p-4 text-center" role="status">
          <span className="vz-empty-icon inline-flex animate-spin">
            <Icono nombre="actualizar" />
          </span>
          <p className="text-sm font-semibold">Sincronizando el borrador del cajero…</p>
        </div>
      )}

      {avisoPersistencia && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-app-acento-texto" role="alert">
          {avisoPersistencia}
        </div>
      )}

      {mensajeNotificacion && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-lime-500/30 bg-lime-500/10 p-3 text-xs font-bold text-app-exito-texto flex items-center gap-2 animate-fade-in"
        >
          <Icono nombre="estado" className="size-4 text-lime-600" />
          <span>{mensajeNotificacion}</span>
        </div>
      )}

      {/* Navegación y Barra Móvil para pantallas < 1024px */}
      <BarraMovilPedido
        lineasCount={lineas.length}
        articulosCount={articulosCount}
        totalEstimado="--"
        vistaActiva={vistaMovil}
        onCambiarVista={setVistaMovil}
      />

      {/* Grilla Principal del POS: 8 columnas Catálogo vs 4 columnas Recibo Térmico */}
      <div className="pos-grid">
        {/* Panel del Catálogo de Productos (Visible en escritorio o cuando la pestaña móvil es catálogo) */}
        <div className={`min-w-0 ${vistaMovil === 'recibo' ? 'hidden lg:block' : 'block'}`}>
          <CatalogoPos
            categorias={categorias}
            productos={productos}
            categoriaSeleccionada={categoriaSeleccionada}
            onSeleccionarCategoria={catId => {
              setCategoriaSeleccionada(catId)
            }}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onSeleccionarProducto={prod => setProductoPersonalizando(prod)}
            cargando={pendiente}
            error={error}
            onReintentar={reintentar}
          />
        </div>

        {/* Panel del Recibo Térmico Financiero (Visible en escritorio o cuando la pestaña móvil es recibo) */}
        <div className={`min-w-0 ${vistaMovil === 'catalogo' ? 'hidden lg:block' : 'block'}`}>
          <ReciboTermico />
        </div>
      </div>

      {/* Modal para Personalizar Producto al Seleccionar de la Carta */}
      {productoPersonalizando && (
        <ModalPersonalizarProducto
          producto={productoPersonalizando}
          onConfirmar={agregarSeleccion}
          onCerrar={() => setProductoPersonalizando(null)}
          deshabilitado={!listoParaOperar}
        />
      )}
    </section>
  )
}
