import { calcularIngrediente, etiquetaUnidad } from '../../utils/recetas.js'
import Icono from '../ui/Icono.jsx'
import Badge from '../ui/Badge.jsx'

export default function VistaPreviaReceta({ filas, heredada, sucia }) {
  return <aside aria-labelledby="titulo-preview-receta" className="vz-recipe-preview">
    <div className="mb-5 flex items-center gap-3"><span className="vz-section-symbol"><Icono nombre="balanza"/></span><div><h2 id="titulo-preview-receta" className="font-titulo text-base font-bold">Vista previa</h2><p className="mt-1 text-xs text-app-secundario">Cantidades para un plato</p></div></div>
    <Badge variante={sucia ? 'advertencia' : 'neutro'}>{heredada ? 'Se utiliza la receta base' : sucia ? 'Cambios sin guardar' : filas.length ? 'Configuración guardada' : 'Sin receta'}</Badge>
    {filas.length ? <ul className="mt-5 space-y-4">{filas.map(fila => {
      const calculo = calcularIngrediente(fila)
      const valido = Object.keys(calculo.errores).length === 0
      return <li key={fila.clave} className="border-t border-app-borde pt-4"><p className="mb-2 break-words text-sm font-semibold">{fila.insumo.nombre}</p>
        {valido ? <><p className="vz-recipe-amount">{calculo.bruto} <span>{etiquetaUnidad(calculo.base)}</span></p><p className="mt-1 text-xs text-app-secundario">Bruto que se guardará</p><dl className="mt-3 flex flex-wrap justify-between gap-3 text-xs text-app-secundario"><div><dt>Rendimiento</dt><dd className="mt-1 font-semibold text-app-texto">{calculo.rendimiento} %</dd></div><div className="text-right"><dt>Neto estimado</dt><dd className="mt-1 font-semibold text-app-texto">{calculo.neto} {etiquetaUnidad(calculo.base)}</dd></div></dl></> : <p className="text-xs text-app-error">Completa los campos con valores válidos para calcular la equivalencia.</p>}
      </li>
    })}</ul> : <div className="py-8 text-center"><span className="vz-empty-icon"><Icono nombre="ingrediente"/></span><p className="text-xs leading-relaxed text-app-secundario">Añade ingredientes para ver sus equivalencias en la unidad base.</p></div>}
    <p className="mt-6 rounded-xl bg-app-elevada p-4 text-xs leading-relaxed text-app-secundario">Se guarda la cantidad bruta en la unidad de almacén, con 4 decimales. El rendimiento es informativo y la merma no se aplica dos veces. Esta vista no modifica existencias.</p>
  </aside>
}
