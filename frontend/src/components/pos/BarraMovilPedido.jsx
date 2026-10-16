import Icono from '../ui/Icono.jsx'
import Badge from '../ui/Badge.jsx'

export default function BarraMovilPedido({
  lineasCount = 0,
  articulosCount = 0,
  totalEstimado = '0.00',
  vistaActiva = 'catalogo',
  onCambiarVista
}) {
  return (
    <>
      {/* Selector de pestañas para móvil en la parte superior (debajo del header) */}
      <div className="flex lg:hidden rounded-xl border border-app-borde bg-app-superficie p-1 gap-1 mb-4">
        <button
          type="button"
          onClick={() => onCambiarVista('catalogo')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            vistaActiva === 'catalogo'
              ? 'bg-marca-dorado text-texto shadow-sm'
              : 'text-app-secundario hover:bg-app-hover hover:text-app-texto'
          }`}
        >
          <Icono nombre="pizza" className="size-4" />
          <span>Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => onCambiarVista('recibo')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            vistaActiva === 'recibo'
              ? 'bg-marca-dorado text-texto shadow-sm'
              : 'text-app-secundario hover:bg-app-hover hover:text-app-texto'
          }`}
        >
          <Icono nombre="carrito" className="size-4" />
          <span>Recibo / Pedido</span>
          {lineasCount > 0 && (
            <Badge variante={vistaActiva === 'recibo' ? 'neutro' : 'exito'}>
              {lineasCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Barra flotante inferior para dispositivos móviles (< 1024px) cuando se navega el catálogo */}
      {vistaActiva === 'catalogo' && lineasCount > 0 && (
        <div className="pos-mobile-bar flex lg:hidden items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-app-secundario block truncate">
              {lineasCount} {lineasCount === 1 ? 'línea' : 'líneas'} · {articulosCount} art.
            </span>
            <span className="font-mono text-lg font-extrabold text-app-texto">
              Total: S/ {totalEstimado}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onCambiarVista('recibo')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-marca-dorado text-texto font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Icono nombre="documento" className="size-4" />
            <span>Ver Recibo</span>
          </button>
        </div>
      )}
    </>
  )
}
