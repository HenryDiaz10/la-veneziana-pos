import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'
import { ejecutarComercial, useComercial } from '../stores/comercial.store.js'
import { consultarSesionCaja, consultarArqueo } from '../services/caja.service.js'
import { solicitarApi } from '../services/api.js'
import { idSesionValido, prepararCierre } from '../utils/arqueo-calculo.js'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import AperturaCaja from '../components/pos/AperturaCaja.jsx'
import ConteoEfectivo from '../components/caja/ConteoEfectivo.jsx'
import ModalMovimientoCaja from '../components/caja/ModalMovimientoCaja.jsx'
import Modal from '../components/ui/Modal.jsx'
import Icono from '../components/ui/Icono.jsx'
import Badge from '../components/ui/Badge.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import TarjetaResumen from '../components/ui/TarjetaResumen.jsx'
import { METODOS_PAGO } from '../utils/pagos-mixtos.js'

const fecha = v => v ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(v)) : 'Sin registro'
const BORRADOR_VACIO = { conteo: { modo: 'importe', importe: '', cantidades: {}, otros: '' }, observaciones: '' }
export default function ArqueoCaja() {
  const uid = useAuthStore(s => s.usuario?.id)
  return <ContenidoArqueo key={uid} uid={uid}/>
}
function ContenidoArqueo({ uid }) {
  const [parametros] = useSearchParams()
  const inicial = parametros.getAll('sesion').length === 1 && idSesionValido(parametros.get('sesion')) ? parametros.get('sesion') : ''
  const [seleccion, setSeleccion] = useState(inicial), [numero, setNumero] = useState(inicial), [errorNumero, setErrorNumero] = useState('')
  // Mantener el conteo por sesión incluso si una consulta falla y se reintenta.
  // El componente exterior elimina esta memoria al cambiar de usuario.
  const [borradores, setBorradores] = useState({})
  const registro = useComercial(uid)
  const solicitud = useMemo(() => ({ revision: registro.ultimaOperacionCaja?.clave }), [registro.ultimaOperacionCaja?.clave])
  const actual = useConsultaRemota(consultarSesionCaja, solicitud, { conservarDatos: true })
  const elegido = seleccion || actual.datos?.sesion?.id || registro.ultimoCierre?.sesionId
  const id = elegido ? String(elegido) : null
  const recurso = useMemo(() => id ? { id, revision: registro.ultimaOperacionCaja?.clave } : null, [id, registro.ultimaOperacionCaja?.clave])
  const resumen = useConsultaRemota(consultarArqueo, recurso, { conservarDatos: true, claveDatos: id })
  const refrescar = () => { actual.reintentar(); resumen.reintentar() }
  return <section className="vz-page" aria-labelledby="titulo-arqueo">
    <header className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="billete"/>La Veneziana · Control de caja</p><h1 id="titulo-arqueo" className="vz-page-title">Arqueo de caja</h1><p className="vz-page-description">Revisa el turno, cuenta el efectivo y confirma su cierre.</p></div><BotonBase className="border border-app-borde" disabled={actual.pendiente || resumen.pendiente} onClick={refrescar}><Icono nombre="actualizar"/>Actualizar resumen</BotonBase></header>
    <form onSubmit={e => { e.preventDefault(); if (!idSesionValido(numero.trim())) { setErrorNumero('Indica un número de sesión válido, mayor que cero.'); return } setErrorNumero(''); setSeleccion(numero.trim()) }} className="vz-cash-lookup">
      <label className="min-w-0 flex-1 text-sm font-semibold">Consultar sesión por número<input className="vz-purchase-input mt-2 w-full" value={numero} onChange={e => setNumero(e.target.value)} inputMode="numeric" autoComplete="off" maxLength={10} placeholder="Opcional · sesión propia"/></label><BotonBase type="submit" className="border border-app-borde">Consultar sesión</BotonBase><BotonBase className="border border-app-borde" onClick={() => { setSeleccion(''); setNumero(''); setErrorNumero(''); refrescar() }}>Ver turno actual</BotonBase>{errorNumero && <p role="alert" className="w-full text-sm text-app-error">{errorNumero}</p>}
    </form>
    {actual.error && <p role="alert" className="vz-panel mb-5 text-app-error">{actual.error}</p>}
    {resumen.error && <div role="alert" className="vz-panel mb-5 space-y-3"><p className="text-app-error">{resumen.error}</p><BotonBase onClick={resumen.reintentar}>Reintentar resumen</BotonBase></div>}
    {(actual.pendiente || resumen.pendiente) && <p role="status" className={resumen.datos ? 'sr-only' : 'vz-panel mb-5'}>Consultando el turno y sus operaciones…</p>}
    {resumen.datos && <TurnoCaja key={id} datos={resumen.datos} pendiente={actual.pendiente || resumen.pendiente} refrescar={refrescar} registro={registro} uid={uid} borrador={borradores[id] ?? BORRADOR_VACIO} onBorrador={parche => setBorradores(prev => ({ ...prev, [id]: { ...(prev[id] ?? BORRADOR_VACIO), ...parche } }))}/>}
    {!actual.pendiente && actual.datos && !actual.datos.sesion && <div className="mt-5"><AperturaCaja onAbrir={() => { setSeleccion(''); refrescar() }}/></div>}
    {!id && !actual.pendiente && !actual.error && <div className="vz-client-welcome"><span className="vz-empty-icon"><Icono nombre="billete"/></span><h2 className="font-titulo text-xl font-bold">Tu siguiente turno empieza aquí</h2><p className="mt-3 text-sm text-app-secundario">Abre una caja para trabajar o consulta un cierre propio por su número de sesión.</p></div>}
  </section>
}
function TurnoCaja({ datos, pendiente, refrescar, registro, uid, borrador, onBorrador }) {
  const r = datos.resumen, t = r.totales, sesionId = r.sesion.id
  const cerrada = datos.estado !== 'abierta'
  const { conteo, observaciones } = borrador
  const [revision, setRevision] = useState(null), [confirmado, setConfirmado] = useState(false)
  const [movimiento, setMovimiento] = useState(false), [ocupado, setOcupado] = useState(false), [aviso, setAviso] = useState('')
  const [impresion, setImpresion] = useState(null)
  const bloqueado = pendiente || ocupado || Boolean(registro.pendiente || registro.error)
  const desactualizado = revision && revision.cuerpo.revision !== datos.revision
  const trabajo = registro.ultimoTrabajoCaja?.sesionId === sesionId ? registro.ultimoTrabajoCaja : datos.impresion
  async function actuar(fn) {
    if (ocupado) return
    setOcupado(true); setAviso('')
    try { await fn() }
    catch (e) { setAviso(e.message); setRevision(null); refrescar() }
    finally { setOcupado(false) }
  }
  function revisar() {
    try { setAviso(''); setConfirmado(false); setRevision(prepararCierre(datos, conteo, observaciones)) }
    catch (e) { setAviso(e.message) }
  }
  function cerrar() {
    return actuar(async () => {
      await ejecutarComercial({ tipo: 'caja.cerrar', ruta: `/caja/sesiones/${sesionId}/cierre`, sesionId, cuerpo: revision.cuerpo })
      setRevision(null); refrescar()
    })
  }
  function copiar() {
    return actuar(async () => {
      const resultado = await ejecutarComercial({ tipo: 'caja.copia', ruta: `/caja/sesiones/${sesionId}/copias`, sesionId, cuerpo: {} })
      if (useAuthStore.getState().usuario?.id === uid) { setImpresion(null); setAviso(`Copia ${resultado.copia.impresion.numero_copia} preparada para el agente de impresión.`) }
    })
  }
  return <div className="space-y-5" aria-busy={pendiente}>
    <div className="vz-cash-banner"><div><p className="vz-kicker">Sesión #{sesionId} · Caja #{r.sesion.caja_fisica_id}</p><h2 className="mt-2 font-titulo text-xl font-bold">{cerrada ? 'Cierre confirmado' : 'Tu turno está en marcha'}</h2><p className="mt-2 text-sm text-app-secundario">Apertura: {fecha(r.sesion.apertura_fecha)}{cerrada && ` · Corte: ${fecha(r.corte_utc)}`}</p></div><Badge variante={cerrada ? 'exito' : 'advertencia'}>{cerrada ? 'Turno cerrado' : 'Caja abierta'}</Badge></div>
    {aviso && <p role="status" className="vz-panel break-words">{aviso}</p>}
    <div className="vz-cash-stats"><TarjetaResumen titulo="Fondo inicial" valor={`S/ ${t.apertura}`} detalle="Apertura de la sesión" icono="billete"/><TarjetaResumen titulo="Efectivo aplicado" valor={`S/ ${t.cobrado_por_metodo.efectivo}`} detalle="Sin sumar recibido ni vuelto otra vez" icono="carrito" tono="verde"/><TarjetaResumen titulo="Efectivo esperado" valor={`S/ ${t.teorico_efectivo}`} detalle="Apertura + cobros + ingresos − egresos − devoluciones" icono="documento"/></div>
    {cerrada && <div className="vz-cash-result" role="region" aria-label="Resultado confirmado del cierre"><div><p className="text-sm">Efectivo contado</p><strong>S/ {r.cierre.contado}</strong></div><div><p className="text-sm">Descuadre confirmado</p><strong className={r.cierre.descuadre === '0.00' ? 'text-app-exito-texto' : 'text-app-error'}>S/ {r.cierre.descuadre}</strong></div><p className="text-xs text-app-secundario">{r.cierre.descuadre === '0.00' ? 'El conteo coincide con el efectivo esperado.' : 'La diferencia queda registrada en el cierre.'}</p>{r.cierre.observaciones && <p className="break-words text-sm">Observaciones: {r.cierre.observaciones}</p>}</div>}
    <div className={`vz-cash-grid ${cerrada ? 'is-closed' : ''}`}>
      <div className="min-w-0 space-y-5">
        <section className="vz-panel space-y-4" aria-labelledby="medios-caja"><div><p className="vz-kicker">Conciliación del turno</p><h2 id="medios-caja" className="mt-2 font-titulo text-lg font-bold">Cobros y devoluciones</h2></div><p className="text-xs text-app-secundario">Cada medio conserva su propio saldo. Las devoluciones de ventas anteriores afectan a la sesión que las desembolsó.</p><div className="vz-cash-methods">{[...METODOS_PAGO, { clave: 'cortesia', nombre: 'Cortesía', icono: 'documento' }].filter(m => t.cobrado_por_metodo[m.clave] !== '0.00' || t.devuelto_por_metodo[m.clave] !== '0.00').map(m => <div key={m.clave} className="vz-cash-method"><div className="flex items-center gap-2 font-semibold"><Icono nombre={m.icono}/>{m.nombre}</div><dl className="mt-3 space-y-2 text-xs"><div><dt>Cobrado</dt><dd>S/ {t.cobrado_por_metodo[m.clave]}</dd></div><div><dt>Devuelto</dt><dd>S/ {t.devuelto_por_metodo[m.clave]}</dd></div><div><dt>Neto</dt><dd className="font-bold">S/ {t.neto_por_metodo[m.clave]}</dd></div></dl>{m.clave === 'puntos_vip' && <p className="mt-2 text-xs text-app-secundario">Equivalencia de puntos, sin efectivo.</p>}</div>)}</div>{!r.pagos.length && !r.devoluciones.length && <p className="text-sm text-app-secundario">Todavía no hay cobros ni devoluciones en este turno.</p>}</section>
        <section className="vz-panel space-y-4" aria-labelledby="movimientos-caja"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="movimientos-caja" className="font-titulo text-lg font-bold">Movimientos de efectivo</h2>{!cerrada && <BotonBase className="border border-app-borde" disabled={bloqueado} onClick={() => setMovimiento(true)}><Icono nombre="mas"/>Registrar movimiento</BotonBase>}</div><div className="grid grid-cols-2 gap-3"><p className="text-sm">Ingresos<strong className="mt-1 block break-all font-mono">S/ {t.ingresos}</strong></p><p className="text-sm">Egresos<strong className="mt-1 block break-all font-mono">S/ {t.egresos}</strong></p></div><ListaMovimientos movimientos={r.movimientos}/></section>
        <details className="vz-panel"><summary className="cursor-pointer font-semibold">Detalle de ventas y devoluciones · {r.ventas.length} ventas</summary><div className="mt-4 space-y-3 text-sm">{r.ventas.map(v => <div key={v.id} className="flex flex-wrap justify-between gap-2 border-b border-app-borde pb-2"><span className="break-all">{v.codigo} · Pedido #{v.pedido_id}</span><strong>S/ {v.total}</strong></div>)}{r.devoluciones.map(d => <p key={d.id}>Devolución #{d.devolucion_id} · {d.metodo_pago}: S/ {d.monto}</p>)}{!r.ventas.length && !r.devoluciones.length && <p>No hay operaciones registradas.</p>}</div></details>
      </div>
      {!cerrada && <ConteoEfectivo valor={conteo} onCambiar={conteo => onBorrador({ conteo })} observaciones={observaciones} onObservaciones={observaciones => onBorrador({ observaciones })} disabled={bloqueado} onRevisar={revisar}/>}
    </div>
    {cerrada && <section className="vz-panel space-y-3"><h2 className="font-titulo text-lg font-bold">Informe del cierre</h2><p className="text-sm text-app-secundario">El original y las copias se generan desde este cierre guardado. El agente está disponible en simulación de 58/80 mm; no hay confirmación de papel impreso.</p><div className="flex flex-wrap gap-3"><BotonBase className="border border-app-borde" disabled={bloqueado} onClick={copiar}>Preparar copia del cierre</BotonBase>{trabajo && <BotonBase className="border border-app-borde" disabled={bloqueado} onClick={() => actuar(async () => { const resultado = await solicitarApi(`/caja/impresion/${trabajo.job_uid}`); if (useAuthStore.getState().usuario?.id === uid) setImpresion(resultado.trabajo) })}>Consultar impresión</BotonBase>}</div>{trabajo && <p className="break-all text-xs text-app-secundario">Trabajo: {trabajo.job_uid}</p>}{impresion && <p role="status">{impresion.estado === 'enviado' ? 'Formato simulado por el agente; sin impresión física confirmada.' : 'Impresión pendiente en el agente.'}</p>}</section>}
    {movimiento && <ModalMovimientoCaja sesionId={sesionId} bloqueado={bloqueado || cerrada} onGuardar={refrescar} onCerrar={() => setMovimiento(false)}/>}
    {revision && <Modal titulo="Confirmar cierre de caja" bloqueado={ocupado} onCerrar={() => setRevision(null)}><div className="space-y-4"><p>Vas a cerrar la sesión <strong>#{sesionId}</strong>. Después necesitarás abrir otra sesión para registrar nuevos cobros o movimientos.</p><div className="vz-cash-count-total"><span>Efectivo contado</span><strong>S/ {revision.cuerpo.cierre_real_efectivo}</strong></div>{revision.cuerpo.observaciones && <p className="break-words text-sm">Observaciones: {revision.cuerpo.observaciones}</p>}<p className="text-sm text-app-secundario">El servidor volverá a comprobar las operaciones y guardará el descuadre definitivo.</p><label className="flex items-start gap-3 text-sm"><input className="mt-1 size-5 shrink-0" type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} disabled={ocupado}/>Revisé el conteo y confirmo el cierre de este turno.</label>{desactualizado && <p role="alert" className="text-app-error">El resumen cambió. Vuelve al conteo y revisa el cierre otra vez.</p>}<div className="flex flex-wrap justify-end gap-3"><BotonBase disabled={ocupado} onClick={() => setRevision(null)}>Volver al conteo</BotonBase><BotonSecundario disabled={!confirmado || bloqueado || desactualizado} onClick={cerrar}>{ocupado ? 'Cerrando turno…' : 'Confirmar cierre de caja'}</BotonSecundario></div></div></Modal>}
  </div>
}
function ListaMovimientos({ movimientos }) {
  const [todos, setTodos] = useState(false)
  if (!movimientos.length) return <p className="text-sm text-app-secundario">No hay ingresos o egresos de caja chica.</p>
  return <><ul className="divide-y divide-app-borde">{(todos ? movimientos : movimientos.slice(-5)).map(m => <li key={m.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div className="min-w-0"><p className="break-words font-semibold">{m.concepto}</p><p className="mt-1 text-xs text-app-secundario">{m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} · {fecha(m.fecha)}</p></div><strong className="break-all font-mono">{m.tipo === 'ingreso' ? '+' : '−'} S/ {m.monto}</strong></li>)}</ul>{movimientos.length > 5 && <BotonBase onClick={() => setTodos(v => !v)}>{todos ? 'Mostrar últimos movimientos' : `Ver los ${movimientos.length} movimientos`}</BotonBase>}</>
}
