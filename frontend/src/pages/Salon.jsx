import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { puedeAccederRuta } from '../utils/accesos.js'
import { useAuthStore } from '../stores/auth.store.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarSalon } from '../services/salon.service.js'
import { ESTADOS_MESA, contarMesas, etiquetaEstado, filtrarMesas } from '../utils/salon-mapa.js'
import MapaMesas from '../components/salon/MapaMesas.jsx'
import Modal from '../components/ui/Modal.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import Icono from '../components/ui/Icono.jsx'
import FormularioSalon from '../components/salon/FormularioSalon.jsx'
import '../styles/salon-configuracion.css'

// Los filtros y la selección no sobreviven a un cambio de empleado.
export default function Salon() {
  const uid = useAuthStore(s => s.usuario?.id)
  return <Contenido key={uid} uid={uid}/>
}
function Contenido({ uid }) {
  const usuario = useAuthStore(s => s.usuario)
  const tomarPedido = puedeAccederRuta(usuario, '/tomar-pedido')
  const cobrar = puedeAccederRuta(usuario, '/pagos')
  const configurar=useAuthStore(s=>s.usuario?.permisos.some(p=>p.modulo==='configuracion'&&p.accion==='gestionar'))
  const [formulario,setFormulario]=useState(null),[mensaje,setMensaje]=useState('')
  const solicitud = useMemo(() => ({ uid }), [uid])
  const { datos, pendiente, error, reintentar } = useConsultaRemota(consultarSalon, solicitud, { conservarDatos: true, claveDatos: uid })
  const [zonaId, setZonaId] = useState(null), [estado, setEstado] = useState(''), [busqueda, setBusqueda] = useState('')
  const [soloMias, setSoloMias] = useState(false), [vista, setVista] = useState('mapa'), [seleccion, setSeleccion] = useState(null)
  const zona = datos?.zonas.find(z => z.id === zonaId) ?? datos?.zonas[0]
  const mesasZona = datos?.mesas.filter(m => m.zona_id === zona?.id) ?? []
  const mesas = filtrarMesas(mesasZona, { estado, busqueda, soloMias, usuarioId: uid })
  const conteo = contarMesas(mesasZona)
  const mesa = datos?.mesas.find(m => m.id === seleccion)
  function limpiar() { setEstado(''); setBusqueda(''); setSoloMias(false) }
  function guardado(r){setFormulario(null);setMensaje(r.eliminada?'Zona eliminada.':r.zona?'Zona guardada. Ya puedes añadir sus mesas.':'Configuración de mesa guardada.');if(r.zona)setZonaId(r.zona.id);if(r.mesa)setZonaId(r.mesa.zona_id);reintentar()}
  return <div className="vz-salon-page space-y-6">
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="mesas"/>La Veneziana · Atención en salón</p><h1 className="vz-page-title">Mapa de mesas</h1><p className="vz-page-description">Consulta la distribución y el estado registrado de cada zona.</p></div>
      <div className="flex flex-wrap gap-3"><BotonBase className="border border-app-borde" disabled={pendiente} onClick={reintentar}><Icono nombre="actualizar"/>{pendiente ? 'Consultando…' : 'Actualizar mesas'}</BotonBase>{configurar&&<><BotonBase onClick={()=>setFormulario({tipo:'zona'})} disabled={pendiente} className="border border-app-borde"><Icono nombre="mas"/>Nueva zona</BotonBase><BotonBase onClick={()=>setFormulario({tipo:'mesa',zonaId:zona?.id})} disabled={pendiente||!zona} className="bg-marca-dorado text-texto"><Icono nombre="mas"/>Nueva mesa</BotonBase></>}</div></header>
    {mensaje&&<p role="status" className="vz-panel text-sm">{mensaje}</p>}
    {error && <div role="alert" className="vz-panel space-y-3"><p>{error}</p><BotonBase onClick={reintentar} disabled={pendiente}>Reintentar consulta</BotonBase></div>}
    {!datos && !error && <p role="status" className="vz-panel">Consultando zonas y mesas…</p>}
    {datos && <>
      <section className="vz-salon-zonebar" aria-label="Zonas del restaurante">{datos.zonas.map(z => <button type="button" key={z.id} aria-pressed={zona?.id === z.id} onClick={() => { setZonaId(z.id); setSeleccion(null) }}><Icono nombre="ubicacion"/><span>{z.nombre}</span><small>{datos.mesas.filter(m => m.zona_id === z.id).length} mesas</small></button>)}</section>
      {!zona ? <section className="vz-panel"><h2 className="font-titulo text-xl font-bold">Todavía no hay zonas registradas</h2><p className="mt-2 text-app-secundario">{configurar?'Crea tu primera zona con Nueva zona y luego agrega sus mesas.':'Cuando se configuren las zonas y mesas del restaurante aparecerán aquí.'}</p></section> : <>
        {configurar&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-borde bg-app-superficie p-4"><p className="text-sm"><strong>Configurar {zona.nombre}</strong><span className="ml-2 text-app-secundario">Administra aforo y distribución de esta zona.</span></p><div className="flex flex-wrap gap-2"><BotonBase className="border border-app-borde" onClick={()=>setFormulario({tipo:'zona',registro:zona})} disabled={pendiente}>Editar zona</BotonBase><BotonBase className="border border-app-borde text-app-error" onClick={()=>setFormulario({tipo:'eliminar-zona',registro:zona})} disabled={pendiente||mesasZona.length>0}>Eliminar zona vacía</BotonBase></div></div>}
        <div className="vz-salon-summary" aria-label="Resumen de la zona">{Object.entries(ESTADOS_MESA).map(([codigo, nombre]) => <div className={`vz-salon-stat is-${codigo}`} key={codigo}><span>{nombre === 'Libre' ? 'Libres' : nombre === 'Ocupada' ? 'Ocupadas' : nombre === 'Inhabilitada' ? 'Inhabilitadas' : nombre}</span><strong>{conteo[codigo]}</strong></div>)}</div>
        <section className="vz-panel space-y-5" aria-label="Consulta de mesas" aria-busy={pendiente}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-titulo text-xl font-bold">{zona.nombre}</h2><p className="mt-1 text-sm text-app-secundario">{conteo.total} mesas · Aforo registrado: {zona.aforo_maximo > 0 ? `${zona.aforo_maximo} personas` : 'sin definir'}</p></div>
            <div className="vz-salon-view" aria-label="Presentación de mesas"><BotonBase aria-pressed={vista === 'mapa'} onClick={() => setVista('mapa')}><Icono nombre="mesas"/>Mapa</BotonBase><BotonBase aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}><Icono nombre="lista"/>Lista</BotonBase></div></div>
          <div className="vz-salon-filters"><label>Buscar mesa<input type="search" placeholder="Código de mesa" value={busqueda} maxLength={40} onChange={e => setBusqueda(e.target.value)}/></label><label>Estado<select aria-label="Estado" value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(ESTADOS_MESA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label><label className="vz-salon-mine"><input type="checkbox" checked={soloMias} onChange={e => setSoloMias(e.target.checked)}/>Solo mis mesas</label><BotonBase onClick={limpiar} className="border border-app-borde">Limpiar filtros</BotonBase></div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-app-secundario"><p role="status">{mesas.length} de {conteo.total} mesas en esta zona{conteo.sin_estado ? ` · ${conteo.sin_estado} sin estado registrado` : ''}</p><p>Consulta: {new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(datos.consultado_en))}</p></div>
          {!mesasZona.length ? <p className="vz-salon-empty">Esta zona todavía no tiene mesas registradas.</p> : <MapaMesas mesasZona={mesasZona} mesasVisibles={mesas} vista={vista} onSeleccionar={setSeleccion}/>}
          <p className="vz-salon-note"><Icono nombre="actualizar"/>Selecciona una mesa para consultar su detalle. Usa Actualizar mesas para obtener los cambios del servidor.</p>
        </section>
      </>}
    </>}
    {seleccion !== null && <Modal titulo={mesa ? `Mesa ${mesa.codigo_mesa}` : 'Mesa no disponible'} onCerrar={() => setSeleccion(null)}>
      {mesa ? <div className="space-y-5"><p className={`vz-salon-detail-state is-${mesa.estado_actual ?? 'sin_estado'}`}>{etiquetaEstado(mesa.estado_actual)}</p><dl className="vz-salon-details"><div><dt>Zona</dt><dd>{datos.zonas.find(z => z.id === mesa.zona_id)?.nombre}</dd></div><div><dt>Capacidad</dt><dd>{mesa.capacidad_sillas > 0 ? `${mesa.capacidad_sillas} sillas` : 'Sin registrar'}</dd></div><div><dt>Mesero asignado</dt><dd>{mesa.mesero_asignado_id ? `Empleado #${mesa.mesero_asignado_id}${mesa.mesero_asignado_id === uid ? ' (tú)' : ''}` : 'Sin asignar'}</dd></div><div><dt>Posición registrada (X, Y)</dt><dd>{mesa.posicion_x ?? 'sin definir'}, {mesa.posicion_y ?? 'sin definir'}</dd></div></dl><p className="text-sm text-app-secundario">Consulta el estado registrado y el responsable de esta mesa.</p></div> : <p>La mesa ya no está en la consulta actual. Actualiza para revisar el salón.</p>}
      {configurar&&mesa&&<div className="mt-5 space-y-2"><BotonBase className="bg-marca-dorado text-texto" disabled={pendiente||!['libre','inhabilitada'].includes(mesa.estado_actual)||mesa.mesero_asignado_id!==null||Boolean(mesa.pedido_abierto)} onClick={()=>{setSeleccion(null);setFormulario({tipo:'mesa',registro:mesa})}}>Editar configuración de mesa</BotonBase><p className="text-xs text-app-secundario">Puedes cambiar zona, código, sillas, ubicación o inhabilitar la mesa. Se conserva su historial.</p></div>}
      {mesa && tomarPedido && !mesa.pedido_abierto && (mesa.estado_actual === 'libre' || (mesa.estado_actual === 'ocupada' && mesa.mesero_asignado_id === uid)) && <Link className="mt-5 inline-flex rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto" to={`/tomar-pedido?mesa=${mesa.id}`}>Tomar pedido en esta mesa</Link>}
      {mesa?.pedido_abierto && <div className="mt-5 space-y-3"><p className="text-sm">Pedido {mesa.pedido_abierto.codigo_pedido} · Número para caja: <strong>{mesa.pedido_abierto.id}</strong></p>{cobrar && <Link className="inline-flex rounded-xl bg-marca-dorado px-4 py-3 font-bold text-texto" to={`/pagos?pedido=${mesa.pedido_abierto.id}`}>Cobrar pedido de esta mesa</Link>}</div>}
      <BotonBase onClick={() => setSeleccion(null)} className="mt-5 border border-app-borde">Cerrar detalle</BotonBase>
    </Modal>}
    {formulario&&<FormularioSalon {...formulario} zonas={datos?.zonas??[]} onCerrar={()=>setFormulario(null)} onGuardado={guardado}/>}
  </div>
}
