import { useEffect, useMemo, useRef, useState } from 'react'
import useConsultaClientes from '../../hooks/useConsultaClientes.js'
import { consultarPerfil, consultarDirecciones, consultarPuntos } from '../../services/clientes.service.js'
import Badge from '../ui/Badge.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import Icono from '../ui/Icono.jsx'
import DataTable from '../ui/DataTable.jsx'
import TarjetaResumen from '../ui/TarjetaResumen.jsx'
import FormularioDatosCliente from './FormularioDatosCliente.jsx'
import PaginacionClientes from './PaginacionClientes.jsx'

const nombreCliente = c => [c.nombres, c.apellidos].filter(Boolean).join(' ')
function fechaCliente(valor) {
  if (!valor || Number.isNaN(new Date(valor).getTime())) return 'Sin registro'
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(valor))
}
const SEGMENTOS = { sin_compras: 'Sin compras registradas', primera_compra: 'Primera compra', recurrente: 'Cliente recurrente' }
const TIPOS = { ganancia_compra: 'Ganancia por compra', canje_premio: 'Canje de premio', bono_manual: 'Bono manual', expiracion: 'Expiración' }
const COLUMNAS_PUNTOS = [
  { clave: 'created_at', titulo: 'Fecha', renderizar: m => <span className="whitespace-nowrap">{fechaCliente(m.created_at)}</span> },
  { clave: 'tipo_movimiento', titulo: 'Movimiento', renderizar: m => TIPOS[m.tipo_movimiento] ?? 'Movimiento registrado' },
  { clave: 'puntos', titulo: 'Puntos', numerica: true, alineacion: 'derecha', renderizar: m => <Badge variante={m.puntos > 0 ? 'exito' : m.puntos < 0 ? 'peligro' : 'neutro'}>{m.puntos > 0 ? '+' : ''}{m.puntos}</Badge> },
  { clave: 'descripcion', titulo: 'Detalle', renderizar: m => <span className="inline-block min-w-40 max-w-md">{m.descripcion || 'Sin descripción'}</span> }
]

function ErrorConsulta({ error, onReintentar }) {
  return <div role="alert" className="vz-panel"><p className="mb-4 text-sm text-app-error">{error}</p>
    <BotonBase onClick={onReintentar} className="border border-app-borde"><Icono nombre="actualizar"/>Reintentar</BotonBase></div>
}

function DireccionesCliente({ id, busqueda, gestionar, onAviso }) {
  const [pagina, setPagina] = useState(1)
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const encabezado = useRef(null)
  const solicitud = useMemo(() => ({ id, busqueda, pagina, revision }), [id, busqueda, pagina, revision])
  const { datos, error, pendiente } = useConsultaClientes(consultarDirecciones, solicitud)
  const recargar = () => setRevision(r => r + 1)
  return <section aria-labelledby="titulo-direcciones" className="mt-6">
    <div className="vz-section-head">
      <div><h3 id="titulo-direcciones" tabIndex={-1} ref={encabezado} className="vz-section-title"><span className="vz-section-symbol"><Icono nombre="ubicacion"/></span>Direcciones de entrega</h3><p className="mt-2 text-xs text-app-secundario">La dirección principal aparece primero.</p></div>
      {gestionar && <BotonSecundario onClick={() => setEditor({ registro: null })}><Icono nombre="mas"/>Nueva dirección</BotonSecundario>}
    </div>
    {error ? <ErrorConsulta error={error} onReintentar={recargar}/> : pendiente ? <p role="status" className="vz-panel text-sm text-app-secundario">Cargando direcciones…</p> : datos?.direcciones.length ?
      <ul className="grid gap-4 xl:grid-cols-2">{datos.direcciones.map(d => <li key={d.id} className="vz-role-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="vz-section-symbol"><Icono nombre="ubicacion"/></span>{d.es_predeterminada && <Badge variante="exito">Principal</Badge>}</div>
        <h4 className="font-titulo text-base font-bold">{d.alias || 'Dirección de entrega'}</h4>
        <p className="mt-3 break-words text-sm leading-relaxed">{d.direccion_completa}</p>
        {d.referencia && <p className="mt-2 break-words text-xs leading-relaxed text-app-secundario">Referencia: {d.referencia}</p>}
        {d.coordenadas_gps && <p className="mt-3 break-words text-xs text-app-secundario">GPS: {d.coordenadas_gps}</p>}
        {gestionar && <div className="vz-row-actions mt-5 border-t border-app-borde pt-4"><BotonBase onClick={() => setEditor({ registro: d })} aria-label={`Editar dirección ${d.alias || d.direccion_completa}`} className="border border-app-borde"><Icono nombre="editar"/>Editar dirección</BotonBase></div>}
      </li>)}</ul> : <div className="vz-panel py-10 text-center"><span className="vz-empty-icon"><Icono nombre="ubicacion"/></span><p className="text-sm font-semibold">Aún no hay direcciones registradas</p><p className="mt-2 text-xs text-app-secundario">Aquí aparecerán los datos de entrega del cliente.</p></div>}
    <PaginacionClientes datos={datos?.paginacion} pendiente={pendiente} pagina={pagina} onPagina={setPagina} nombre="Paginación de direcciones"/>
    {editor && <FormularioDatosCliente key={editor.registro?.id ?? 'nueva'} modo="direccion" clienteId={id} registro={editor.registro} onCerrar={() => setEditor(null)}
      onGuardado={() => { setEditor(null); setPagina(1); recargar(); onAviso('Dirección guardada correctamente.'); requestAnimationFrame(() => encabezado.current?.focus()) }}/ >}
  </section>
}

function HistorialPuntos({ id, busqueda }) {
  const [pagina, setPagina] = useState(1)
  const [revision, setRevision] = useState(0)
  const solicitud = useMemo(() => ({ id, busqueda, pagina, revision }), [id, busqueda, pagina, revision])
  const { datos, error, pendiente } = useConsultaClientes(consultarPuntos, solicitud)
  return <section className="mt-6" aria-label="Historial de puntos del cliente">
    <p className="mb-5 text-xs leading-relaxed text-app-secundario">Movimientos registrados por el sistema. Esta vista no modifica puntos ni recalcula el saldo del cliente.</p>
    <DataTable titulo="Movimientos de Puntos Veneziana" columnas={COLUMNAS_PUNTOS} filas={datos?.movimientos ?? []} cargando={pendiente} error={error} mensajeVacio="Este cliente todavía no tiene movimientos de puntos."/>
    {error && <BotonBase className="mt-3 border border-app-borde" onClick={() => setRevision(r => r + 1)}>Reintentar</BotonBase>}
    <PaginacionClientes datos={datos?.paginacion} pendiente={pendiente} pagina={pagina} onPagina={setPagina} nombre="Paginación de puntos"/>
  </section>
}

export default function PerfilCliente({ seleccion, gestionar, onEditar, onCerrar, onAviso }) {
  const [revision, setRevision] = useState(0)
  const [vista, setVista] = useState('direcciones')
  const encabezado = useRef(null)
  const solicitud = useMemo(() => ({ ...seleccion, revision }), [seleccion, revision])
  const { datos, error, pendiente } = useConsultaClientes(consultarPerfil, solicitud)
  useEffect(() => { if (datos) encabezado.current?.focus() }, [datos])
  if (pendiente) return <section aria-label="Perfil del cliente" className="vz-panel mt-8" role="status">Cargando perfil del cliente…</section>
  if (error) return <div className="mt-8"><ErrorConsulta error={error} onReintentar={() => setRevision(r => r + 1)}/><BotonBase className="mt-3 border border-app-borde" onClick={onCerrar}>Cerrar perfil</BotonBase></div>
  if (!datos) return null
  const cliente = datos.cliente
  return <section aria-labelledby="titulo-perfil-cliente" className="vz-client-profile mt-8">
    <div className="vz-panel mb-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex w-full min-w-0 items-center gap-4 sm:w-auto sm:flex-1"><span className="vz-client-avatar" aria-hidden="true">{[cliente.nombres, cliente.apellidos].filter(Boolean).map(p => p[0]).join('')}</span>
          <div className="min-w-0"><p className="vz-kicker">Ficha del cliente</p><h2 id="titulo-perfil-cliente" ref={encabezado} tabIndex={-1} className="break-words font-titulo text-xl font-bold">{nombreCliente(cliente)}</h2><p className="mt-2 text-xs text-app-secundario">{SEGMENTOS[cliente.actividad.segmento] ?? 'Actividad registrada'}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {gestionar && <BotonBase onClick={() => onEditar(cliente)} className="border border-app-borde"><Icono nombre="editar"/>Editar datos</BotonBase>}
          <BotonBase onClick={onCerrar} aria-label="Cerrar perfil del cliente" className="border border-app-borde"><Icono nombre="cerrar"/>Cerrar</BotonBase>
        </div>
      </div>
      <dl className="mt-6 grid gap-5 border-t border-app-borde pt-5 text-sm sm:grid-cols-3">
        <div><dt className="mb-2 text-xs text-app-secundario">Documento · {cliente.tipo_documento || 'Sin tipo'}</dt><dd className="break-words font-semibold">{cliente.numero_documento || 'No registrado'}</dd></div>
        <div><dt className="mb-2 text-xs text-app-secundario">Teléfono</dt><dd className="break-words font-semibold">{cliente.telefono_principal || 'No registrado'}</dd></div>
        <div><dt className="mb-2 text-xs text-app-secundario">Última compra registrada</dt><dd className="font-semibold">{fechaCliente(cliente.actividad.ultima_compra)}</dd></div>
      </dl>
    </div>
    <div className="vz-stats">
      <TarjetaResumen titulo="Nivel VIP" valor={cliente.nivel_vip || 'Sin nivel'} detalle="Nivel registrado en el sistema" icono="premio" tono="dorado"/>
      <TarjetaResumen titulo="Puntos disponibles" valor={cliente.puntos_vip_actuales ?? 0} detalle="Saldo oficial del cliente" icono="puntos" tono="lima"/>
      <TarjetaResumen titulo="Compras registradas" valor={cliente.actividad.compras_registradas} detalle="Pedidos pagados; excluye comprobantes anulados" icono="carrito" tono="rojo"/>
    </div>
    <nav aria-label="Contenido de la ficha" className="vz-client-sections">
      <button type="button" aria-pressed={vista === 'direcciones'} onClick={() => setVista('direcciones')}><Icono nombre="ubicacion"/>Direcciones</button>
      {gestionar && <button type="button" aria-pressed={vista === 'puntos'} onClick={() => setVista('puntos')}><Icono nombre="puntos"/>Movimientos de puntos</button>}
    </nav>
    {vista === 'puntos' && gestionar ? <HistorialPuntos id={cliente.id} busqueda={seleccion.busqueda}/> : <DireccionesCliente id={cliente.id} busqueda={seleccion.busqueda} gestionar={gestionar} onAviso={onAviso}/>}
  </section>
}
