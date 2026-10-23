import { useMemo, useState } from 'react'
import { useAuthStore } from '../stores/auth.store.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarSalon } from '../services/salon.service.js'
import { ESTADOS_MESA, contarMesas, etiquetaEstado, filtrarMesas } from '../utils/salon-mapa.js'
import MapaMesas from '../components/salon/MapaMesas.jsx'
import Modal from '../components/ui/Modal.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import Icono from '../components/ui/Icono.jsx'

// Los filtros y la selección no sobreviven a un cambio de empleado.
export default function Salon() {
  const uid = useAuthStore(s => s.usuario?.id)
  return <Contenido key={uid} uid={uid}/>
}
function Contenido({ uid }) {
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
  return <div className="vz-salon-page space-y-6">
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="mesas"/>La Veneziana · Atención en salón</p><h1 className="vz-page-title">Mapa de mesas</h1><p className="vz-page-description">Consulta la distribución y el estado registrado de cada zona.</p></div>
      <BotonBase className="border border-app-borde" disabled={pendiente} onClick={reintentar}><Icono nombre="actualizar"/>{pendiente ? 'Consultando…' : 'Actualizar mesas'}</BotonBase></header>
    {error && <div role="alert" className="vz-panel space-y-3"><p>{error}</p><BotonBase onClick={reintentar} disabled={pendiente}>Reintentar consulta</BotonBase></div>}
    {!datos && !error && <p role="status" className="vz-panel">Consultando zonas y mesas…</p>}
    {datos && <>
      <section className="vz-salon-zonebar" aria-label="Zonas del restaurante">{datos.zonas.map(z => <button type="button" key={z.id} aria-pressed={zona?.id === z.id} onClick={() => { setZonaId(z.id); setSeleccion(null) }}><Icono nombre="ubicacion"/><span>{z.nombre}</span><small>{datos.mesas.filter(m => m.zona_id === z.id).length} mesas</small></button>)}</section>
      {!zona ? <section className="vz-panel"><h2 className="font-titulo text-xl font-bold">Todavía no hay zonas registradas</h2><p className="mt-2 text-app-secundario">Cuando se configuren las zonas y mesas del restaurante aparecerán aquí.</p></section> : <>
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
      <BotonBase onClick={() => setSeleccion(null)} className="mt-5 border border-app-borde">Cerrar detalle</BotonBase>
    </Modal>}
  </div>
}
