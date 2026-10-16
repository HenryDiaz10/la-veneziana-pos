import { useRef, useState } from 'react'
import { guardarReceta } from '../../services/recetas.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'
import { filasDesdeReceta, calcularIngrediente, prepararReceta, baseInsumo } from '../../utils/recetas.js'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import Icono from '../ui/Icono.jsx'
import FilaIngrediente from './FilaIngrediente.jsx'
import VistaPreviaReceta from './VistaPreviaReceta.jsx'
import SelectorRecursoReceta from './SelectorRecursoReceta.jsx'

const firma = filas => JSON.stringify(filas.map(f => [f.insumo.id, f.cantidad, f.unidad, f.tipo, f.merma]))

export default function EditorReceta({ producto, receta, base, varianteId, onEstado }) {
  const [original, setOriginal] = useState(() => filasDesdeReceta(receta))
  const [filas, setFilas] = useState(() => filasDesdeReceta(receta))
  const [selector, setSelector] = useState(false)
  const [pendiente, setPendiente] = useState(false)
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const enCurso = useRef(false)
  const formulario = useRef(null)
  const titulo = useRef(null)
  const comprobarSesion = useAuthStore(s => s.comprobarSesion)
  const sucia = firma(filas) !== firma(original)
  const baseDisponible = varianteId !== null && base.ingredientes.length > 0
  const heredada = baseDisponible && original.length === 0 && !sucia

  function cambiar(nuevas) {
    setFilas(nuevas); setError(''); setMensaje('')
    onEstado({ sucia: firma(nuevas) !== firma(original), guardando: false })
  }

  function agregar(insumo) {
    setSelector(false)
    if (filas.length >= 100 || filas.some(f => f.insumo.id === insumo.id)) return
    const base = baseInsumo(insumo)
    cambiar([...filas, { clave: `insumo-${insumo.id}`, insumo, cantidad: '', unidad: base === 'kg' ? 'g' : base === 'l' ? 'ml' : 'un', tipo: 'bruta', merma: '0.00' }])
    requestAnimationFrame(() => formulario.current?.elements.namedItem(`cantidad-${insumo.id}`)?.focus())
  }

  async function guardar(evento) {
    evento.preventDefault()
    if (enCurso.current) return
    setError(''); setMensaje(''); setMostrarErrores(true)
    const entrada = prepararReceta(filas, varianteId)
    if (entrada.error) {
      setError(entrada.error)
      requestAnimationFrame(() => formulario.current?.querySelector('input[aria-invalid="true"], select[aria-invalid="true"], [data-error-insumo]')?.focus())
      return
    }
    enCurso.current = true; setPendiente(true); onEstado({ sucia, guardando: true })
    let guardada = false
    try {
      const respuesta = await guardarReceta(producto.id, entrada.datos)
      if (!Array.isArray(respuesta?.receta?.ingredientes) || respuesta.receta.ingredientes.length === 0) throw new Error('Respuesta incompleta')
      const nuevas = filasDesdeReceta(respuesta.receta)
      setOriginal(nuevas); setFilas(nuevas); setMostrarErrores(false)
      setMensaje('Receta guardada correctamente. Las cantidades se muestran ahora en bruto y en la unidad base.')
      guardada = true
      requestAnimationFrame(() => titulo.current?.focus())
    } catch (fallo) {
      if (fallo instanceof ErrorApi && fallo.estado === 401) await comprobarSesion()
      setError(fallo instanceof ErrorApi ? fallo.message : 'No se pudo confirmar el guardado. Se conservaron los datos; vuelve a intentarlo.')
    } finally {
      enCurso.current = false; setPendiente(false); onEstado({ sucia: guardada ? false : sucia, guardando: false })
    }
  }

  return <>
    {mensaje && <p className="vz-notice" role="status"><Icono nombre="estado"/>{mensaje}</p>}
    {error && <p role="alert" className="mb-5 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error">{error}</p>}
    {heredada && <div className="vz-recipe-inherited mb-5"><div><h2 className="font-titulo text-sm font-bold">Esta variante utiliza la receta base</h2><p className="mt-2 text-xs leading-relaxed text-app-secundario">Puedes conservarla o copiarla para crear una receta específica. Al guardar una variante, su receta sustituye por completo a la base.</p></div><BotonBase onClick={() => cambiar(filasDesdeReceta(base))} className="shrink-0 border border-app-borde"><Icono nombre="copiar"/>Copiar receta base</BotonBase></div>}
    <form ref={formulario} onSubmit={guardar} noValidate aria-busy={pendiente}>
      <fieldset disabled={pendiente}>
        <div className="vz-recipe-grid">
          <section className="min-w-0" aria-labelledby="titulo-ingredientes">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 id="titulo-ingredientes" ref={titulo} tabIndex={-1} className="vz-section-title"><span className="vz-section-symbol"><Icono nombre="ingrediente"/></span>Ingredientes</h2><p className="mt-2 text-xs text-app-secundario">{filas.length} de 100 ingredientes · cantidades para un plato</p></div><BotonSecundario disabled={filas.length >= 100} onClick={() => setSelector(true)}><Icono nombre="mas"/>Añadir ingrediente</BotonSecundario></div>
            {filas.length ? <div className="space-y-4">{filas.map((fila, indice) => <FilaIngrediente key={fila.clave} fila={fila} indice={indice} errores={mostrarErrores ? calcularIngrediente(fila).errores : {}}
              onChange={(campo, valor) => cambiar(filas.map((f, i) => i === indice ? { ...f, [campo]: valor } : f))} onRetirar={() => cambiar(filas.filter((_, i) => i !== indice))}/>)}</div> : <div className="vz-panel py-12 text-center"><span className="vz-empty-icon"><Icono nombre="recetas"/></span><h3 className="font-titulo text-base font-bold">{heredada ? 'Personaliza esta variante' : 'Construye la receta de tu producto'}</h3><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-app-secundario">{heredada ? 'Copia la receta base o añade los ingredientes que corresponden a esta variante.' : 'Selecciona los insumos de almacén e indica la cantidad necesaria de cada uno.'}</p></div>}
          </section>
          <VistaPreviaReceta filas={heredada ? filasDesdeReceta(base) : filas} heredada={heredada} sucia={sucia}/>
        </div>
        <div className="vz-recipe-save">
          <div><p className="text-sm font-semibold">{sucia ? 'Hay cambios sin guardar' : original.length ? 'Receta guardada' : heredada ? 'Receta base en uso' : 'Todavía no hay una receta guardada'}</p><p className="mt-1 text-xs text-app-secundario">Se guarda el conjunto completo. Las tareas anteriores conservan su receta.</p></div>
          <div className="flex flex-wrap gap-3"><BotonBase disabled={!sucia} className="border border-app-borde bg-app-superficie" onClick={() => { cambiar(original); setMostrarErrores(false) }}>Restablecer campos</BotonBase><BotonSecundario type="submit" disabled={!sucia || filas.length === 0} cargando={pendiente} textoCargando="Guardando receta…"><Icono nombre="guardar"/>Guardar receta</BotonSecundario></div>
        </div>
      </fieldset>
    </form>
    {selector && <SelectorRecursoReceta tipo="insumo" excluidos={filas.map(f => f.insumo.id)} onElegir={agregar} onCerrar={() => setSelector(false)}/>}
  </>
}
