import { useId } from 'react'

// Campo compartido por el POS y la edición del borrador. El store vuelve a
// validar el texto antes de guardarlo; React lo muestra siempre como texto.
export default function IndicacionesProducto({ valor, onChange, disabled = false }) {
  const id = useId()
  return <div className="space-y-2 border-t border-app-borde pt-4">
    <label htmlFor={id} className="block text-sm font-bold">Indicaciones para cocina <span className="font-normal text-app-secundario">(opcional)</span></label>
    <textarea id={id} value={valor} onChange={e => onChange(e.target.value)}
      disabled={disabled} maxLength={250} rows={3} aria-describedby={`${id}-ayuda`}
      placeholder="Por ejemplo: sin cebolla o poco ají."
      className="w-full resize-y rounded-xl border border-app-borde bg-app-superficie p-3 text-sm text-app-texto"/>
    <p id={`${id}-ayuda`} className="text-xs text-app-secundario">Estas indicaciones se aplican a todas las unidades de esta línea. Para otra preparación, añade una línea diferente. {valor.length}/250</p>
  </div>
}
