import { Link } from 'react-router-dom'
import Icono from '../components/ui/Icono.jsx'

// El diseño reserva espacio para las operaciones que se incorporarán después.
function PuntoVenta() {
  return (
    <section aria-labelledby="titulo-pos" className="vz-page">
      <div className="vz-page-header">
        <div><p className="vz-kicker">La Veneziana · Ventas</p><h1 id="titulo-pos" className="vz-page-title">Punto de venta</h1><p className="vz-page-description">Espacio de atención y preparación de pedidos.</p></div>
        <Link to="/inicio" className="vz-button inline-flex min-h-11 items-center gap-2 border border-app-borde bg-app-superficie px-4 py-3 font-semibold"><Icono nombre="inicio"/>Volver al inicio</Link>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="titulo-productos" className="vz-panel min-w-0">
          <h2 id="titulo-productos" className="vz-section-title"><span className="vz-section-symbol"><Icono nombre="pizza"/></span>Productos</h2>
          <div className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-app-borde bg-app-elevada p-8 text-center">
            <span className="vz-empty-icon"><Icono nombre="catalogo"/></span>
            <p className="font-semibold">La carta se está preparando</p>
            <p className="mt-3 max-w-sm text-sm text-app-secundario">La selección de productos para la venta estará disponible en una próxima fase.</p>
          </div>
        </section>
        <section aria-labelledby="titulo-carrito" className="vz-panel min-w-0">
          <h2 id="titulo-carrito" className="vz-section-title"><span className="vz-section-symbol"><Icono nombre="carrito"/></span>Carrito</h2>
          <div className="py-10 text-center"><span className="vz-empty-icon"><Icono nombre="lista"/></span><p className="font-semibold">Espacio para tu pedido</p><p className="mt-3 text-sm leading-relaxed text-app-secundario">La selección de productos y el cobro estarán disponibles en una próxima fase.</p></div>
        </section>
      </div>
    </section>
  )
}
export default PuntoVenta
