import { Link } from 'react-router-dom'

// Estructura inicial del POS. Las operaciones se incorporarán después.
function PuntoVenta() {
  return (
    <section aria-labelledby="titulo-pos" className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1
          id="titulo-pos"
          className="font-titulo text-2xl font-bold"
        >
          Punto de venta
        </h1>

        <Link
          to="/inicio"
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-app-hover"
        >
          Volver al inicio
        </Link>
      </div>

      {/* En escritorio, reservar una columna lateral para el carrito.
          En móvil, las secciones se muestran una debajo de la otra. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="titulo-productos"
          className="min-w-0 rounded-2xl border border-app-borde bg-app-superficie p-6 shadow-sm"
        >
          <h2
            id="titulo-productos"
            className="font-titulo text-lg font-semibold"
          >
            Productos
          </h2>

          <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-app-borde bg-app-elevada p-6">
            <p className="max-w-sm text-center text-sm text-app-secundario">
              El catálogo de productos estará disponible en una próxima fase.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="titulo-carrito"
          className="min-w-0 rounded-2xl border border-app-borde bg-app-superficie p-6 shadow-sm"
        >
          <h2
            id="titulo-carrito"
            className="font-titulo text-lg font-semibold"
          >
            Carrito
          </h2>

          <p className="mt-5 rounded-xl bg-app-elevada p-5 text-sm text-app-secundario">
            La selección de productos y el cobro estarán disponibles
            en una próxima fase.
          </p>
        </section>
      </div>
    </section>
  )
}

export default PuntoVenta