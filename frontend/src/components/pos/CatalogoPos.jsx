import Icono from '../ui/Icono.jsx'
import BotonBase from '../ui/BotonBase.jsx'

export default function CatalogoPos({
  categorias = [],
  productos = [],
  categoriaSeleccionada = null,
  onSeleccionarCategoria,
  busqueda = '',
  onBuscar,
  onSeleccionarProducto,
  cargando = false,
  error = '',
  onReintentar
}) {
  return (
    <section aria-labelledby="titulo-catalogo-pos" className="vz-panel space-y-5 p-4 sm:p-6">
      {/* Encabezado y Barra de Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="titulo-catalogo-pos" className="vz-section-title">
            <span className="vz-section-symbol">
              <Icono nombre="pizza" />
            </span>
            Catálogo de Productos
          </h2>
          <p className="vz-page-description">
            Selecciona una pizza, bebida o acompañamiento para agregar al pedido.
          </p>
        </div>

        {/* Buscador de productos */}
        <div className="w-full sm:w-72">
          <label htmlFor="buscador-pos-catalogo" className="sr-only">
            Buscar producto por nombre o código
          </label>
          <div className="vz-search-field">
            <Icono nombre="buscar" />
            <input
              id="buscador-pos-catalogo"
              type="search"
              placeholder="Buscar pizza, SKU o código…"
              value={busqueda}
              maxLength={150}
              onChange={e => onBuscar(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => onBuscar('')}
                className="mr-3 text-app-secundario hover:text-app-texto p-1"
              >
                <Icono nombre="cerrar" className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selector de Categorías (Pills Horizontales) */}
      <div className="pos-categories-bar pb-2" role="tablist" aria-label="Filtrar por categoría">
        <button
          type="button"
          role="tab"
          aria-selected={categoriaSeleccionada === null}
          onClick={() => onSeleccionarCategoria(null)}
          className={`pos-category-btn ${categoriaSeleccionada === null ? 'is-active' : ''}`}
        >
          <Icono nombre="catalogo" className="size-4" />
          <span>Todas ({productos.length})</span>
        </button>

        {categorias.map(cat => {
          const activa = categoriaSeleccionada === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => onSeleccionarCategoria(cat.id)}
              className={`pos-category-btn ${activa ? 'is-active' : ''}`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: cat.color_hex || '#f59e0b' }}
                aria-hidden="true"
              />
              <span>{cat.nombre}</span>
            </button>
          )
        })}
      </div>

      {/* Estados de Carga, Error y Vacío */}
      {cargando && (
        <div className="py-16 text-center" role="status">
          <span className="vz-empty-icon inline-flex animate-spin">
            <Icono nombre="actualizar" />
          </span>
          <p className="font-semibold text-app-texto">Cargando catálogo del punto de venta…</p>
          <p className="mt-1 text-sm text-app-secundario">Consultando productos y categorías activas.</p>
        </div>
      )}

      {error && !cargando && (
        <div className="rounded-xl border border-app-error/30 bg-app-error/10 p-6 text-center space-y-3">
          <p role="alert" className="text-sm font-semibold text-app-error">
            {error}
          </p>
          <BotonBase onClick={onReintentar}>
            Reintentar catálogo
          </BotonBase>
        </div>
      )}

      {!cargando && !error && productos.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-dashed border-app-borde bg-app-elevada p-6">
          <span className="vz-empty-icon">
            <Icono nombre="pizza" />
          </span>
          <p className="font-semibold text-app-texto">No se encontraron productos disponibles</p>
          <p className="mt-2 text-sm text-app-secundario max-w-md mx-auto">
            {busqueda
              ? `No hay coincidencias para «${busqueda}». Intenta con otro término o limpia la búsqueda.`
              : 'No hay productos activos en la categoría seleccionada.'}
          </p>
          {busqueda && (
            <button
              type="button"
              onClick={() => onBuscar('')}
              className="mt-4 text-xs font-bold text-marca-dorado underline hover:no-underline"
            >
              Ver todos los productos
            </button>
          )}
        </div>
      )}

      {/* Grilla de Productos */}
      {!cargando && !error && productos.length > 0 && (
        <div className="pos-products-grid">
          {productos.map(producto => (
            <article
              key={producto.id}
              className="pos-product-card group"
              aria-labelledby={`producto-nombre-${producto.id}`}
            >
              {/* Imagen o Fallback */}
              <div className="pos-product-thumb">
                {producto.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    loading="lazy"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className="pos-product-fallback"
                  style={{ display: producto.imagen_url ? 'none' : 'flex' }}
                >
                  <Icono nombre="pizza" className="size-8" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">La Veneziana</span>
                </div>
              </div>

              {/* Información */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h3
                    id={`producto-nombre-${producto.id}`}
                    className="font-titulo text-sm font-bold text-app-texto leading-snug break-words group-hover:text-marca-dorado transition-colors"
                  >
                    {producto.nombre}
                  </h3>
                  {producto.descripcion && (
                    <p className="mt-1 text-xs text-app-secundario line-clamp-2 leading-relaxed">
                      {producto.descripcion}
                    </p>
                  )}
                </div>

                {/* Precio y Acción */}
                <div className="mt-4 pt-3 border-t border-app-borde flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-app-secundario block uppercase tracking-wider font-semibold">Desde</span>
                    <span className="font-mono text-base font-extrabold text-app-texto">
                      S/ {producto.precio_venta_base}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSeleccionarProducto(producto)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-marca-dorado text-texto font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                    aria-label={`Añadir ${producto.nombre} al pedido`}
                  >
                    <Icono nombre="mas" className="size-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
