import { useCallback, useMemo, useState } from 'react'
import { useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { cargarConstructorReceta } from '../services/recetas.service.js'
import SelectorRecursoReceta from '../components/recetas/SelectorRecursoReceta.jsx'
import SelectorVarianteReceta from '../components/recetas/SelectorVarianteReceta.jsx'
import EditorReceta from '../components/recetas/EditorReceta.jsx'
import ImagenProducto from '../components/catalogo/ImagenProducto.jsx'
import Modal from '../components/ui/Modal.jsx'
import Icono from '../components/ui/Icono.jsx'
import Badge from '../components/ui/Badge.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'

function idConsulta(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) return null
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero <= 2147483647 ? numero : null
}

export default function Recetas() {
  const [parametros, setParametros] = useSearchParams()
  const productoId = idConsulta(parametros.get('producto'))
  const varianteId = idConsulta(parametros.get('variante'))
  const consultaInvalida = (parametros.has('producto') && productoId === null) ||
    (parametros.has('variante') && (varianteId === null || productoId === null)) ||
    parametros.getAll('producto').length > 1 || parametros.getAll('variante').length > 1
  const [revision, setRevision] = useState(0)
  const [selector, setSelector] = useState(false)
  const [recargaPendiente, setRecargaPendiente] = useState(false)
  const [estado, setEstado] = useState({ sucia: false, guardando: false })
  const solicitud = useMemo(() => productoId && !consultaInvalida ? { productoId, varianteId, revision } : null,
    [productoId, varianteId, revision, consultaInvalida])
  const { datos, error, pendiente } = useConsultaRemota(cargarConstructorReceta, solicitud)

  // Bloquear enlaces, cambios de variante y Atrás/Adelante mediante el router.
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => (estado.sucia || estado.guardando) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useBeforeUnload(useCallback(evento => {
    if (estado.sucia || estado.guardando) { evento.preventDefault(); evento.returnValue = '' }
  }, [estado.sucia, estado.guardando]))

  function recargar() { setEstado({ sucia: false, guardando: false }); setRecargaPendiente(false); setRevision(r => r + 1) }

  return <section className="vz-page" aria-labelledby="titulo-recetas">
    <div className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="recetas"/>La Veneziana · Preparación</p><h1 id="titulo-recetas" className="vz-page-title">Constructor de recetas</h1><p className="vz-page-description">Cada ingrediente en su medida. Define cómo se prepara cada plato de tu carta.</p></div>
      <BotonSecundario disabled={estado.guardando} onClick={() => setSelector(true)}><Icono nombre="pizza"/>{productoId ? 'Cambiar producto' : 'Elegir producto'}</BotonSecundario>
    </div>
    {consultaInvalida ? <div role="alert" className="vz-panel"><p className="text-sm text-app-error">El producto o la variante de esta dirección no son válidos. Elige un producto para continuar.</p></div> : pendiente ? <p className="vz-panel text-sm" role="status">Cargando producto y receta…</p> : error ? <div className="vz-panel" role="alert"><p className="mb-4 text-sm text-app-error">{error}</p><BotonBase onClick={recargar} className="border border-app-borde"><Icono nombre="actualizar"/>Reintentar receta</BotonBase></div> : datos?.producto ? <>
      <div className="vz-recipe-context">
        <div className="flex w-full min-w-0 items-center gap-4 xl:w-auto xl:flex-1"><ImagenProducto url={datos.producto.imagen_url} descripcion="" className="h-16 w-16 shrink-0"/>
          <div className="min-w-0"><p className="vz-kicker">Producto seleccionado</p><h2 className="break-words font-titulo text-lg font-bold">{datos.producto.nombre}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-app-secundario">{datos.producto.sku || 'Sin SKU'}</span><Badge variante={datos.producto.estado === 'activo' ? 'exito' : 'neutro'}>{datos.producto.estado === 'activo' ? 'Activo' : 'Inactivo u oculto'}</Badge></div></div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-end gap-3 xl:w-96">
          <SelectorVarianteReceta key={productoId} productoId={productoId} varianteId={varianteId} nombreVariante={datos.producto.nombre_variante} disabled={estado.guardando}
            onChange={id => setParametros({ producto: String(productoId), ...(id ? { variante: String(id) } : {}) })}/>
          <BotonBase disabled={estado.guardando} onClick={() => estado.sucia ? setRecargaPendiente(true) : recargar()} aria-label="Recargar receta" className="border border-app-borde"><Icono nombre="actualizar"/></BotonBase>
        </div>
      </div>
      <p className="mb-6 text-xs leading-relaxed text-app-secundario">{varianteId ? `Estás editando la receta específica de ${datos.producto.nombre_variante}. Al guardarla sustituirá a la base para esta variante.` : 'La receta base se aplica a las variantes que no tengan una receta específica.'} Al reabrir, las cantidades se muestran en bruto y en la unidad base.</p>
      <EditorReceta key={`${productoId}-${varianteId ?? 'base'}-${revision}`} producto={datos.producto} receta={datos.receta} base={datos.base} varianteId={varianteId} onEstado={setEstado}/>
    </> : <div className="vz-client-welcome"><div className="vz-client-welcome-art" aria-hidden="true"><Icono nombre="recetas"/></div><p className="vz-kicker">El sabor empieza aquí</p><h2 className="font-titulo text-xl font-bold">Una receta clara para cada producto</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-app-secundario">Elige un plato preparado, selecciona su variante y añade ingredientes con sus cantidades. Verás las equivalencias antes de guardar.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Badge variante="advertencia">Unidades compatibles</Badge><Badge variante="exito">Rendimiento explicado</Badge><Badge>Recetas por variante</Badge></div></div>}
    {selector && bloqueo.state !== 'blocked' && <SelectorRecursoReceta tipo="producto" onCerrar={() => setSelector(false)} onElegir={producto => { setSelector(false); setParametros({ producto: String(producto.id) }) }}/>}
    {bloqueo.state === 'blocked' && <Modal titulo={estado.guardando ? 'Guardando receta' : estado.sucia ? 'Hay cambios sin guardar' : 'Receta guardada'} descripcion={estado.guardando ? 'Espera a que termine el guardado para continuar.' : estado.sucia ? 'Si continúas, se descartarán los cambios que no hayas guardado en esta receta.' : 'Los cambios ya se guardaron. Puedes continuar.'} onCerrar={() => bloqueo.reset()} bloqueado={estado.guardando}>
      <div className="flex flex-wrap justify-end gap-3"><BotonBase disabled={estado.guardando} onClick={() => bloqueo.reset()} className="border border-app-borde">Seguir editando</BotonBase><BotonSecundario disabled={estado.guardando} onClick={() => { setEstado({ sucia: false, guardando: false }); setSelector(false); bloqueo.proceed() }}>{estado.sucia ? 'Descartar y continuar' : 'Continuar'}</BotonSecundario></div>
    </Modal>}
    {recargaPendiente && <Modal titulo="¿Descartar cambios y recargar?" descripcion="Se recuperará la última receta guardada. Tus cambios actuales no se guardarán." onCerrar={() => setRecargaPendiente(false)}><div className="flex flex-wrap justify-end gap-3"><BotonBase onClick={() => setRecargaPendiente(false)} className="border border-app-borde">Seguir editando</BotonBase><BotonSecundario onClick={recargar}>Descartar y recargar</BotonSecundario></div></Modal>}
  </section>
}
