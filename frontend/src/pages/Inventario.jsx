import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarInventario } from '../services/inventario.service.js'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Icono from '../components/ui/Icono.jsx'
import TarjetaResumen from '../components/ui/TarjetaResumen.jsx'
import PaginacionClientes from '../components/clientes/PaginacionClientes.jsx'
import DetalleInventario from '../components/inventario/DetalleInventario.jsx'
import { ALERTAS, cantidad, fecha } from '../components/inventario/presentacion.js'

// La selección de la URL se valida antes de consultar el detalle.
const idValido = texto => typeof texto === 'string' && /^[1-9]\d{0,9}$/.test(texto) && Number(texto) <= 2147483647
export default function Inventario() {
  const [parametros, setParametros] = useSearchParams()
  const producto = parametros.get('producto'), insumo = parametros.get('insumo')
  const invalida = (producto !== null && !idValido(producto)) || (insumo !== null && !idValido(insumo)) ||
    (producto !== null && insumo !== null) || parametros.getAll('producto').length > 1 || parametros.getAll('insumo').length > 1
  const seleccion = useMemo(() => !invalida && (producto || insumo) ? { tipo: producto ? 'producto' : 'insumo', id: Number(producto || insumo) } : null, [producto, insumo, invalida])
  const [texto, setTexto] = useState('')
  const [solicitud, setSolicitud] = useState({ pagina: 1, busqueda: '', alerta: 'todos', revision: 0 })
  const { datos, error, pendiente } = useConsultaRemota(consultarInventario, solicitud)
  useEffect(() => {
    const temporizador = setTimeout(() => setSolicitud(s => s.busqueda === texto.trim() ? s : { ...s, pagina: 1, busqueda: texto.trim() }), 300)
    return () => clearTimeout(temporizador)
  }, [texto])
  const actualizar = () => setSolicitud(s => ({ ...s, pagina: s.busqueda === texto.trim() ? s.pagina : 1, busqueda: texto.trim(), revision: s.revision + 1 }))
  const columnas = [
    { clave: 'nombre', titulo: 'Insumo', renderizar: i => <div className="min-w-44"><p className="font-semibold">{i.nombre}</p><p className="mt-1 text-xs text-app-secundario">{i.codigo || 'Sin código'} · {i.unidad}</p>{i.productos_directos > 0 && <p className="mt-2 text-xs text-app-secundario">{i.productos_directos} {i.productos_directos === 1 ? 'producto directo vinculado' : 'productos directos vinculados'}</p>}</div> },
    ...[['stock_fisico', 'Físico'], ['stock_reservado', 'Reservado'], ['disponible', 'Disponible'], ['stock_minimo_alerta', 'Mínimo']].map(([clave, titulo]) => ({ clave, titulo, numerica: true, alineacion: 'derecha', renderizar: i => <span className={clave === 'disponible' ? 'font-bold' : ''}>{cantidad(i[clave])} <span className="text-xs text-app-secundario">{i.unidad}</span></span> })),
    { clave: 'alerta', titulo: 'Estado', renderizar: i => <div className="flex flex-col items-start gap-2"><Badge variante={ALERTAS[i.alerta]?.variante}>{ALERTAS[i.alerta]?.texto}</Badge>{!i.activo && i.alerta !== 'inactivo' && <Badge>Inactivo</Badge>}</div> },
    { clave: 'detalle', titulo: 'Consulta', renderizar: i => <BotonBase onClick={() => setParametros({ insumo: String(i.id) })} className="vz-row-action" aria-label={`Ver detalle de ${i.nombre}`}><Icono nombre="historial"/>Ver detalle</BotonBase> }
  ]
  return <section className="vz-page" aria-labelledby="titulo-inventario">
    <div className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="inventario"/>La Veneziana · Almacén</p><h1 id="titulo-inventario" className="vz-page-title">Inventario</h1><p className="vz-page-description">Conoce lo que tienes, lo comprometido y lo disponible para atender.</p></div><BotonSecundario onClick={actualizar} disabled={pendiente}><Icono nombre="actualizar"/>Actualizar</BotonSecundario></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Insumos encontrados', 'total', 'inventario', 'dorado', 'Resultado de la búsqueda'],
      ['Stock bajo', 'bajos', 'balanza', 'dorado', 'Disponible en el mínimo o por debajo'],
      ['Sin disponible', 'agotados', 'alerta', 'rojo', 'Insumos activos sin cantidad libre'],
      ['Quiebres declarados', 'quiebres', 'estado', 'rojo', 'Revisar antes de confirmar pedidos']
    ].map(([titulo, clave, icono, tono, detalle]) => <TarjetaResumen key={clave} titulo={titulo} valor={datos?.resumen?.[clave] ?? '—'} pendiente={pendiente} icono={icono} tono={tono} detalle={detalle}/>)}</div>
    <form className="vz-panel mb-6 vz-inventory-search-panel" role="search" onSubmit={e => { e.preventDefault(); actualizar() }}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]"><div><label htmlFor="buscar-inventario" className="mb-2 block text-sm font-semibold">Buscar en almacén</label><div className="vz-inventory-search"><Icono nombre="buscar"/><input id="buscar-inventario" type="search" value={texto} onChange={e => setTexto(e.target.value)} maxLength={150} className="field-input" placeholder="Insumo, código o producto directo"/></div></div><div><label htmlFor="alerta-inventario" className="mb-2 block text-sm font-semibold">Filtrar por alerta</label><select id="alerta-inventario" className="field-input" value={solicitud.alerta} onChange={e => setSolicitud(s => ({ ...s, alerta: e.target.value, pagina: 1 }))}><option value="todos">Todos los insumos</option><option value="bajo">Stock bajo</option><option value="agotado">Sin disponible</option><option value="quiebre">Quiebre declarado</option></select></div></div>
      <p className="mt-3 text-xs text-app-secundario">Disponible = físico - reservado. Las cantidades se muestran en la unidad base de cada insumo.</p>
    </form>
    {invalida && <div role="alert" className="vz-panel mb-5"><p className="mb-3 text-sm text-app-error">El identificador de esta dirección no es válido. Selecciona un insumo del listado.</p><BotonBase onClick={() => setParametros({})} className="border border-app-borde">Cerrar selección inválida</BotonBase></div>}
    <DataTable titulo="Existencias de almacén" columnas={columnas} filas={datos?.insumos ?? []} cargando={pendiente} error={error} alineacionVertical="centro" mensajeVacio={solicitud.busqueda || solicitud.alerta !== 'todos' ? 'No hay insumos que coincidan con esta búsqueda y alerta.' : 'Todavía no hay insumos registrados en almacén.'}/>
    {error && <BotonBase onClick={actualizar} className="mt-3 border border-app-borde">Reintentar inventario</BotonBase>}
    <PaginacionClientes nombre="Páginas del inventario" datos={datos?.paginacion} pendiente={pendiente} pagina={solicitud.pagina} onPagina={pagina => setSolicitud(s => ({ ...s, pagina }))}/>
    {datos && <p className="mt-4 text-xs text-app-secundario">Consulta: {fecha(datos.consultado_en)}. Los indicadores cuentan insumos de la búsqueda en todas las páginas; las alertas pueden coincidir.</p>}
    {seleccion && <DetalleInventario key={`${seleccion.tipo}-${seleccion.id}`} seleccion={seleccion} onCerrar={() => setParametros({})}/>}
  </section>
}

