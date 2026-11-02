import { useState } from 'react'
import useTableroKds from '../hooks/useTableroKds.js'
import { ETAPAS_KDS, NOMBRES_KDS, destinoKds, etiquetaAccionKds } from '../utils/kds-tablero.js'
import TarjetaKds from '../components/kds/TarjetaKds.jsx'
import Modal from '../components/ui/Modal.jsx'
import AvisosKds from '../components/kds/AvisosKds.jsx'
import useRelojKds from '../hooks/useRelojKds.js'
import useAvisosKds from '../hooks/useAvisosKds.js'
import '../styles/kds.css'

export default function TableroKds() {
  const kds = useTableroKds()
  const reloj = useRelojKds(kds.muestraReloj)
  const audio = useAvisosKds(kds.aviso, reloj.monotono)
  const [canal, setCanal] = useState('todos'), [etapa, setEtapa] = useState('todas'), [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState(null), [motivo, setMotivo] = useState(''), [autorizacion, setAutorizacion] = useState('')
  const consulta = busqueda.trim().toLocaleLowerCase('es')
  const tareas = kds.tareas.filter(t => (canal === 'todos' || canal === t.canal) && (!consulta || `${t.nombre} ${t.pedido.codigo} ${destinoKds(t)}`.toLocaleLowerCase('es').includes(consulta)))
  const bloqueado = !kds.listo || kds.enviando || Boolean(kds.intento)
  function elegir(tarea, estado) { setSeleccion({ tarea, estado }); setMotivo(''); setAutorizacion('') }
  const cancelar = seleccion?.estado === 'cancelado'
  const tardia = cancelar && (seleccion.tarea.estado !== 'espera' || Boolean(seleccion.tarea.iniciado_en))
  function confirmar(event) {
    event.preventDefault()
    const s = seleccion
    setSeleccion(null)
    void kds.enviar(s.tarea.id, { version: s.tarea.version, estado: s.estado,
      ...(cancelar ? { motivo, ...(tardia ? { autorizacion_id: autorizacion } : {}) } : {}) })
  }
  return <section className="vz-kds">
    <header className="vz-kds-cabecera"><div><p className="vz-kds-eyebrow">LA VENEZIANA · OPERACIÓN</p><h1>Cocina y despacho</h1><p className="text-app-secundario">Cada preparación, sus indicaciones y su destino.</p></div><div className="vz-kds-conexion"><span role="status">{kds.estado}</span><button type="button" onClick={kds.refrescar} disabled={kds.enviando}>Actualizar tablero</button></div></header>
    {kds.error && <p role="alert" className="vz-kds-aviso">{kds.error} Los datos anteriores se conservan para consulta.</p>}
    {kds.intento && !kds.enviando && <div className="vz-kds-aviso" role="alert"><p>La respuesta no se confirmó. Reintenta la misma operación antes de continuar. No pulses otra etapa.</p><button type="button" onClick={kds.reintentar}>Reintentar operación</button></div>}
    {kds.enviando && <p role="status" className="vz-kds-aviso">Confirmando con el servidor…</p>}
    <AvisosKds audio={audio} aviso={kds.aviso} sincronizado={kds.listo}/>
    <div className="vz-kds-filtros"><label>Área<select aria-label="Área" value={canal} onChange={e => setCanal(e.target.value)}><option value="todos">Todas las áreas</option><option value="cocina">Cocina</option><option value="despacho">Despacho de bebidas</option></select></label><label>Etapa<select aria-label="Etapa" value={etapa} onChange={e => setEtapa(e.target.value)}><option value="todas">Todas las etapas</option>{ETAPAS_KDS.map(e => <option value={e} key={e}>{NOMBRES_KDS[e]} ({tareas.filter(t => t.estado === e).length})</option>)}</select></label><label>Buscar preparación<input aria-label="Buscar preparación" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Producto, pedido o mesa"/></label></div>
    {!kds.listo && !kds.tareas.length && <p role="status" className="vz-kds-vacio">Esperando información del servidor. Puedes usar Actualizar tablero para reintentar.</p>}
    <div className={`vz-kds-columnas ${etapa !== 'todas' ? 'es-etapa-unica' : ''}`} aria-label="Etapas de preparación">{ETAPAS_KDS.filter(e => etapa === 'todas' || etapa === e).map(e => {
      const filas = tareas.filter(t => t.estado === e)
      return <section key={e} className={`vz-kds-columna etapa-${e}`} aria-label={NOMBRES_KDS[e]}><header><h2>{NOMBRES_KDS[e]}</h2><span>{filas.length}</span></header><div className="vz-kds-tickets">{filas.map(t => <TarjetaKds key={t.id} tarea={t} bloqueado={bloqueado} onAccion={elegir} ahora={reloj.ahora} umbrales={audio.preferencias.umbrales} sincronizado={kds.listo}/>)}{!filas.length && <p className="vz-kds-vacio">Sin preparaciones en esta etapa.</p>}</div></section>
    })}</div>
    <p className="vz-kds-pie">Listo significa preparado; confirma la entrega cuando llegue a su destino. Las cantidades y los componentes se conservan por tarea.</p>
    {seleccion && <Modal titulo={etiquetaAccionKds(seleccion.estado)} onCerrar={() => setSeleccion(null)}><form onSubmit={confirmar} className="vz-kds-form"><p><strong>{seleccion.tarea.cantidad} × {seleccion.tarea.nombre}</strong><br/>{seleccion.tarea.pedido.codigo} · {destinoKds(seleccion.tarea)}</p><p>De {NOMBRES_KDS[seleccion.tarea.estado]} a {NOMBRES_KDS[seleccion.estado]}.</p>
      {cancelar ? <><p>{tardia ? 'El consumo ya realizado se conserva. Necesitas una autorización vigente para esta tarea.' : 'Se liberará la reserva sin devolver consumos anteriores.'} Esta acción cancela la preparación; no elimina ni descuenta la línea de la cuenta.</p><label>Motivo de cancelación<textarea required minLength={3} maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)}/></label>{tardia && <label>ID de autorización<input aria-label="ID de autorización" required inputMode="numeric" pattern="[1-9][0-9]{0,18}" value={autorizacion} onChange={e => setAutorizacion(e.target.value)}/><small>Solicita al administrador una aprobación para la tarea #{seleccion.tarea.id} y tu usuario.</small></label>}</> : <p>{seleccion.estado === 'preparando' || seleccion.tarea.canal === 'despacho' ? 'Se confirmará el consumo de los insumos reservados una sola vez.' : 'El cambio se mostrará después de la confirmación del servidor.'}</p>}
      <button type="submit" disabled={bloqueado}>Confirmar cambio</button><button type="button" onClick={() => setSeleccion(null)}>Volver</button></form></Modal>}
  </section>
}
