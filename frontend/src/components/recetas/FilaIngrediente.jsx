import { useId } from 'react'
import BotonBase from '../ui/BotonBase.jsx'
import Icono from '../ui/Icono.jsx'
import { baseInsumo, unidadesInsumo, etiquetaUnidad } from '../../utils/recetas.js'

export default function FilaIngrediente({ fila, indice, errores, onChange, onRetirar }) {
  const prefijo = useId()
  const campos = [
    { clave: 'tipo', texto: 'Ingresar como', opciones: [['bruta', 'Cantidad bruta'], ['neta', 'Cantidad neta']] },
    { clave: 'cantidad', texto: 'Cantidad', placeholder: 'Ej. 200' },
    { clave: 'unidad', texto: 'Unidad de entrada', opciones: unidadesInsumo(fila.insumo).map(u => [u, etiquetaUnidad(u)]) },
    { clave: 'merma', texto: 'Merma esperada (%)', placeholder: 'Ej. 10.00' }
  ]
  return <article className="vz-recipe-line" tabIndex={-1} data-error-insumo={errores.insumo ? true : undefined}>
    <div className="mb-5 flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="vz-recipe-number">{indice + 1}</span><div className="min-w-0"><h3 className="break-words font-titulo text-sm font-bold">{fila.insumo.nombre}</h3><p className="mt-1 text-xs text-app-secundario">Unidad base: {fila.insumo.unidad?.nombre ?? 'No disponible'} ({etiquetaUnidad(baseInsumo(fila.insumo))})</p></div></div>
      <BotonBase onClick={onRetirar} aria-label={`Retirar ${fila.insumo.nombre}`} className="vz-recipe-remove"><Icono nombre="eliminar"/></BotonBase>
    </div>
    {errores.insumo && <p role="alert" className="mb-4 text-xs text-app-error">{errores.insumo}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{campos.map(campo => {
      const id = `${prefijo}-${campo.clave}`
      const comunes = { id, name: `${campo.clave}-${fila.insumo.id}`, value: fila[campo.clave], onChange: e => onChange(campo.clave, e.target.value),
        'aria-invalid': Boolean(errores[campo.clave]), 'aria-describedby': errores[campo.clave] ? `${id}-error` : undefined,
        className: 'vz-recipe-input' }
      return <div key={campo.clave}><label htmlFor={id} className="mb-2 block text-xs font-semibold">{campo.texto}<span className="sr-only"> de {fila.insumo.nombre}</span></label>
        {campo.opciones ? <select {...comunes}>{campo.opciones.length === 0 && <option value={fila.unidad}>Unidad no compatible</option>}{campo.opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select> : <input {...comunes} type="text" inputMode="decimal" autoComplete="off" maxLength={21} placeholder={campo.placeholder}/>}
        {errores[campo.clave] && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-app-error">{errores[campo.clave]}</p>}
      </div>
    })}</div>
    <p className="mt-4 text-xs leading-relaxed text-app-secundario">{fila.tipo === 'neta' ? 'Calcularemos la cantidad bruta necesaria usando la merma indicada.' : 'Esta cantidad ya incluye la merma; no se aumentará otra vez.'}</p>
  </article>
}
