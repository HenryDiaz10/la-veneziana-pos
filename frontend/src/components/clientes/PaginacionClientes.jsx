import BotonBase from '../ui/BotonBase.jsx'

export default function PaginacionClientes({ datos, pendiente, pagina, onPagina, nombre }) {
  const total = Math.max(1, datos?.totalPaginas ?? 1)
  return <nav aria-label={nombre} className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-app-secundario">
    <p aria-live="polite">Página {pagina} de {total}{datos ? ` · ${datos.total} ${datos.total === 1 ? 'registro' : 'registros'}` : ''}</p>
    <div className="flex gap-2">
      <BotonBase disabled={pendiente || pagina <= 1} onClick={() => onPagina(pagina - 1)} className="border border-app-borde bg-app-superficie">Anterior</BotonBase>
      <BotonBase disabled={pendiente || !datos || pagina >= total || pagina >= 10000} onClick={() => onPagina(pagina + 1)} className="border border-app-borde bg-app-superficie">Siguiente</BotonBase>
    </div>
  </nav>
}
