import { etiquetaModificador } from '../../utils/modificadores.js'

// Compartir etiquetas entre personalización, recibo y revisión del borrador.
// Renderizar nombres como texto, sin HTML procedente de catálogo o notas.
export default function ResumenModificadores({ opciones = [] }) {
  if (!opciones.length) return null
  return <ul aria-label="Opciones seleccionadas" className="mt-2 flex flex-wrap gap-1.5">
    {opciones.map(o => <li key={o.id} className={`max-w-full break-words rounded-lg border px-2 py-1 text-xs ${o.es_exclusion ? 'border-amber-500/40 bg-amber-500/10 text-app-texto' : 'border-app-borde bg-app-elevada text-app-secundario'}`}>
      {etiquetaModificador(o)}
    </li>)}
  </ul>
}
