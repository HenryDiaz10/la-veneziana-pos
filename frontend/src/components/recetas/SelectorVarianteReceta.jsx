import { useMemo, useState } from 'react'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarVariantesReceta } from '../../services/recetas.service.js'
import BotonBase from '../ui/BotonBase.jsx'

export default function SelectorVarianteReceta({ productoId, varianteId, nombreVariante, disabled, onChange }) {
  const [pagina, setPagina] = useState(1)
  const [revision, setRevision] = useState(0)
  const solicitud = useMemo(() => ({ productoId, pagina, revision }), [productoId, pagina, revision])
  const { datos, pendiente, error } = useConsultaRemota(consultarVariantesReceta, solicitud, { conservarDatos: true, claveDatos: productoId })
  const variantes = datos?.variantes ?? []
  return <div className="min-w-0 flex-1">
    <label htmlFor="variante-receta" className="mb-2 block text-xs font-semibold">Receta que deseas editar</label>
    <select id="variante-receta" value={varianteId ?? ''} disabled={disabled || pendiente || Boolean(error)} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} className="min-h-12 w-full rounded-lg border border-app-borde bg-app-fondo px-3 py-3 text-sm">
      <option value="">Receta base del producto</option>
      {varianteId !== null && !variantes.some(v => v.id === varianteId) && <option value={varianteId}>{nombreVariante || 'Variante seleccionada'}</option>}
      {variantes.map(v => <option key={v.id} value={v.id}>{v.nombre_variante}</option>)}
    </select>
    {pendiente && <p role="status" className={datos ? 'sr-only' : 'mt-2 text-xs text-app-secundario'}>Consultando variantes…</p>}
    {error && <div role="alert" className="mt-2 text-xs text-app-error"><p>{error}</p><BotonBase className="mt-2 border border-app-borde" disabled={disabled} onClick={() => setRevision(r => r + 1)}>Reintentar variantes</BotonBase></div>}
    {datos?.paginacion.totalPaginas > 1 && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-app-secundario">
      <BotonBase disabled={disabled || pendiente || pagina <= 1} onClick={() => setPagina(p => p - 1)} className="border border-app-borde">Variantes anteriores</BotonBase>
      <span>Página {pendiente ? datos.paginacion.pagina ?? pagina : pagina} de {datos.paginacion.totalPaginas}</span>
      <BotonBase disabled={disabled || pendiente || pagina >= datos.paginacion.totalPaginas || pagina >= 10000} onClick={() => setPagina(p => p + 1)} className="border border-app-borde">Más variantes</BotonBase>
    </div>}
  </div>
}
