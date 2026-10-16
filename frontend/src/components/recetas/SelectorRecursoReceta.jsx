import { useId, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import Icono from '../ui/Icono.jsx'
import Badge from '../ui/Badge.jsx'
import ImagenProducto from '../catalogo/ImagenProducto.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { buscarProductosReceta, consultarInsumosReceta } from '../../services/recetas.service.js'
import { unidadesInsumo } from '../../utils/recetas.js'

export default function SelectorRecursoReceta({ tipo, excluidos = [], onElegir, onCerrar }) {
  const producto = tipo === 'producto'
  const id = useId()
  const [texto, setTexto] = useState('')
  const [solicitud, setSolicitud] = useState({ pagina: 1, busqueda: '' })
  const { datos, pendiente, error } = useConsultaRemota(producto ? buscarProductosReceta : consultarInsumosReceta, solicitud)
  const filas = (producto ? datos?.productos : datos?.insumos) ?? []
  function buscar(evento) { evento.preventDefault(); setSolicitud({ pagina: 1, busqueda: texto.trim() }) }
  return <Modal titulo={producto ? 'Seleccionar producto' : 'Añadir ingrediente'} descripcion={producto ? 'Elige un plato preparado para construir su receta.' : 'Cada insumo conserva la unidad base definida en almacén.'} onCerrar={onCerrar}>
    <form onSubmit={buscar} className="mb-5">
      <label htmlFor={id} className="mb-2 block font-semibold">{producto ? 'Buscar producto por nombre o SKU' : 'Buscar insumo por nombre o código'}</label>
      <div className="flex flex-wrap gap-2"><input id={id} value={texto} onChange={e => setTexto(e.target.value)} maxLength={150} type="search" autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-lg border border-app-borde bg-app-fondo px-3 text-sm"/>
        <BotonBase type="submit" className="border border-app-borde"><Icono nombre="buscar"/>Buscar</BotonBase>
        {texto && <BotonBase onClick={() => { setTexto(''); setSolicitud({ pagina: 1, busqueda: '' }) }} className="border border-app-borde">Limpiar</BotonBase>}
      </div>
    </form>
    {pendiente ? <p role="status" className="py-8 text-center text-sm text-app-secundario">Consultando {producto ? 'productos' : 'insumos'}…</p> : error ? <div role="alert"><p className="mb-3 text-sm text-app-error">{error}</p><BotonBase onClick={() => setSolicitud(s => ({ ...s }))}>Reintentar</BotonBase></div> : filas.length ?
      <ul className="vz-recipe-picker">{filas.map(fila => {
        const agregado = excluidos.includes(fila.id)
        const apto = producto ? fila.tipo_producto === 'plato_preparado' : fila.activo === true && unidadesInsumo(fila).length > 0
        const detalle = producto ? (apto ? fila.sku || 'Plato preparado' : 'Venta directa o combo: no utiliza esta receta') : `${fila.unidad?.nombre ?? 'Unidad no disponible'} · ${fila.unidad?.abreviatura ?? ''}`
        return <li key={fila.id}><button type="button" disabled={!apto || agregado} onClick={() => onElegir(fila)} className="vz-recipe-pick" aria-label={`${producto ? 'Elegir producto' : 'Añadir insumo'} ${fila.nombre}`}>
          {producto ? <ImagenProducto url={fila.imagen_url} descripcion="" className="h-12 w-12 shrink-0"/> : <span className="vz-section-symbol"><Icono nombre="ingrediente"/></span>}
          <span className="min-w-0 flex-1 text-left"><strong className="block break-words text-sm">{fila.nombre}</strong><span className="mt-1 block break-words text-xs text-app-secundario">{detalle}</span></span>
          {agregado ? <Badge>Agregado</Badge> : !apto ? <Badge variante="peligro">No disponible</Badge> : producto && fila.estado !== 'activo' ? <Badge>Inactivo</Badge> : <Icono nombre={producto ? 'flecha' : 'mas'}/>}
        </button></li>
      })}</ul> : <div className="py-8 text-center"><span className="vz-empty-icon"><Icono nombre={producto ? 'pizza' : 'ingrediente'}/></span><p className="text-sm font-semibold">{solicitud.busqueda ? 'No hay coincidencias para esta búsqueda.' : producto ? 'Todavía no hay productos registrados.' : 'Todavía no hay insumos registrados.'}</p><p className="mt-3 text-xs text-app-secundario">{producto ? 'Registra tus productos en Catálogo para preparar sus recetas.' : 'Necesitas insumos de almacén para añadir ingredientes a la receta.'}</p></div>}
    {datos?.paginacion && <nav aria-label={`Paginación de ${producto ? 'productos' : 'insumos'}`} className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-app-borde pt-4">
      <p className="text-xs text-app-secundario">Página {solicitud.pagina} de {Math.max(1, datos.paginacion.totalPaginas)} · {datos.paginacion.total} registros</p>
      <div className="flex gap-2"><BotonBase disabled={pendiente || solicitud.pagina <= 1} className="border border-app-borde" onClick={() => setSolicitud(s => ({ ...s, pagina: s.pagina - 1 }))}>Anterior</BotonBase><BotonBase disabled={pendiente || solicitud.pagina >= datos.paginacion.totalPaginas || solicitud.pagina >= 10000} className="border border-app-borde" onClick={() => setSolicitud(s => ({ ...s, pagina: s.pagina + 1 }))}>Siguiente</BotonBase></div>
    </nav>}
  </Modal>
}
