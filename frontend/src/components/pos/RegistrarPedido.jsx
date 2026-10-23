import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { solicitarApi } from '../../services/api.js'
import { buscarClientes, consultarDirecciones } from '../../services/clientes.service.js'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { useAuthStore } from '../../stores/auth.store.js'
import { useCartStore, normalizarLineaCarrito } from '../../stores/useCartStore.js'
import { capturarOrigen, ejecutarComercial, useComercial } from '../../stores/comercial.store.js'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import Modal from '../ui/Modal.jsx'

const cargarMesas = (_, signal) => solicitarApi('/pedidos/registro', { signal })
const SOLICITUD = {}
const campo = 'vz-purchase-input w-full'
export default function RegistrarPedido({ consulta, listo }) {
  const usuario = useAuthStore(s => s.usuario)
  const comercial = useComercial(usuario?.id)
  const [tipo, setTipo] = useState('llevar')
  const [mesa, setMesa] = useState('')
  const [notas, setNotas] = useState('')
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [direccion, setDireccion] = useState('')
  const [pagina, setPagina] = useState(1)
  const [confirmar, setConfirmar] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const crear = usuario?.permisos.some(p => p.modulo === 'pedidos' && p.accion === 'crear')
  const crm = usuario?.permisos.some(p => p.modulo === 'clientes' && p.accion === 'buscar')
  const mesas = useConsultaRemota(cargarMesas, crear ? SOLICITUD : null)
  const clientes = useConsultaRemota(buscarClientes, buscar)
  const solicitudDireccion = useMemo(() => cliente ? { id: cliente.id, busqueda: buscar.busqueda, pagina } : null, [cliente, buscar, pagina])
  const direcciones = useConsultaRemota(consultarDirecciones, solicitudDireccion)
  const registrados = Object.entries(comercial.vinculos)
  const bloqueado = ocupado || Boolean(comercial.pendiente || comercial.error) || !listo
  async function registrar() {
    if (ocupado) return
    setOcupado(true); setError('')
    try {
      const uid = usuario.id
      const carrito = useCartStore.getState()
      if (!carrito.carritoPreparado || carrito.usuarioCarritoId !== uid) throw new Error('Espera la recuperación de tu carrito.')
      const lineas = carrito.lineas
      const origen = await capturarOrigen(lineas)
      if (useAuthStore.getState().usuario?.id !== uid || useCartStore.getState().lineas !== lineas) throw new Error('El borrador cambió; revísalo de nuevo.')
      await ejecutarComercial({ tipo: 'pedido.crear', ruta: '/pedidos', origen, cuerpo: {
        tipo_atencion: tipo, mesa_id: tipo === 'salon' ? Number(mesa) : null,
        cliente_id: cliente?.id ?? null, direccion_id: tipo === 'delivery' ? Number(direccion) : null,
        notas_globales: notas, lineas: lineas.map(({ productoId, varianteId, modificadoresIds, cantidad, indicaciones }) => normalizarLineaCarrito({ productoId, varianteId, modificadoresIds, cantidad, indicaciones }))
      } })
      setConfirmar(false)
    } catch (e) { setError(e.message) }
    finally { setOcupado(false) }
  }
  if (!crear) return <p className="vz-panel">Necesitas permiso para registrar pedidos.</p>
  if (registrados.length) return <div className="vz-panel mb-5 space-y-3" role="status"><h2 className="font-bold">Pedido registrado · pendiente de pago</h2><p className="text-sm">El borrador se conserva hasta confirmar el cobro. Usa el pedido existente para evitar duplicarlo.</p>{registrados.map(([id, v]) => <p key={id}><Link className="font-bold text-app-acento-texto underline" to={`/pagos?pedido=${id}`}>Continuar con {v.codigo || `pedido ${id}`} · Cobrar</Link></p>)}</div>
  return <div className="vz-panel mb-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-titulo text-lg font-bold">Confirmación del pedido</h2><p className="mt-1 text-xs text-app-secundario">{tipo === 'salon' ? 'En salón' : tipo === 'delivery' ? 'Delivery' : 'Para llevar'} · Borrador sin registrar</p></div><BotonBase className="border border-app-borde" aria-expanded={mostrar} aria-controls="datos-registro-pedido" onClick={() => setMostrar(v => !v)}>Datos y registro del pedido</BotonBase></div>
    <div id="datos-registro-pedido" hidden={!mostrar} className="space-y-4">
    <p className="text-sm text-app-secundario">Revisa el recibo y las indicaciones. Registrar reserva existencias y envía la preparación a la cola de cocina; todavía no cobra.</p>
    <fieldset disabled={bloqueado} className="grid gap-4 sm:grid-cols-2">
      <label>Atención<select aria-label={"Atenci\u00f3n"} className={campo} value={tipo} onChange={e => { setTipo(e.target.value); setDireccion('') }}><option value="llevar">Para llevar</option><option value="salon">En salón</option>{crm && <option value="delivery">Delivery</option>}</select></label>
      {tipo === 'salon' && <label>Mesa libre<select aria-label="Mesa libre" className={campo} value={mesa} onChange={e => setMesa(e.target.value)}><option value="">Selecciona mesa</option>{mesas.datos?.mesas.map(m => <option key={m.id} value={m.id}>{m.codigo_mesa}</option>)}</select><BotonBase onClick={mesas.reintentar} disabled={mesas.pendiente}>Actualizar mesas</BotonBase>{mesas.error && <span role="alert">{mesas.error}</span>}</label>}
      <label className="sm:col-span-2">Indicaciones generales<textarea className={campo} value={notas} maxLength={500} onChange={e => setNotas(e.target.value)} rows={2}/></label>
    </fieldset>
    {crm && <div className="space-y-3"><form onSubmit={e => { e.preventDefault(); setCliente(null); setDireccion(''); setPagina(1); setBuscar({ busqueda: { telefono: texto.trim() }, pagina: 1 }) }} className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1">Cliente por teléfono exacto (opcional)<input className={campo} value={texto} maxLength={20} onChange={e => setTexto(e.target.value)} disabled={bloqueado}/></label><BotonBase type="submit" disabled={bloqueado || clientes.pendiente}>Buscar cliente</BotonBase><BotonBase disabled={bloqueado} onClick={() => { setCliente(null); setBuscar(null); setDireccion('') }}>Sin cliente</BotonBase></form>
      {clientes.error && <p role="alert">{clientes.error}</p>}
      {clientes.datos && <label>Cliente<select className={campo} disabled={bloqueado || clientes.pendiente} value={cliente?.id ?? ''} onChange={e => { setCliente(clientes.datos.clientes.find(c => c.id === Number(e.target.value)) ?? null); setDireccion(''); setPagina(1) }}><option value="">Selecciona cliente</option>{clientes.datos.clientes.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}</select></label>}
      {tipo === 'delivery' && cliente && <div><label>Dirección registrada<select className={campo} disabled={bloqueado || direcciones.pendiente} value={direccion} onChange={e => setDireccion(e.target.value)}><option value="">Selecciona dirección</option>{direcciones.datos?.direcciones.map(d => <option key={d.id} value={d.id}>{d.direccion_completa}</option>)}</select></label><div className="flex gap-2"><BotonBase disabled={bloqueado || direcciones.pendiente || pagina <= 1} onClick={() => { setDireccion(''); setPagina(p => p - 1) }}>Direcciones anteriores</BotonBase><BotonBase disabled={bloqueado || direcciones.pendiente || pagina >= (direcciones.datos?.paginacion.totalPaginas ?? 1)} onClick={() => { setDireccion(''); setPagina(p => p + 1) }}>Más direcciones</BotonBase></div>{direcciones.error && <p role="alert">{direcciones.error}</p>} <p className="text-xs">El total corresponde a productos; no incluye una tarifa automática de reparto.</p></div>}
    </div>}
    <BotonSecundario disabled={bloqueado || consulta.pendiente || Boolean(consulta.error || consulta.resumen?.errorTotal) || !consulta.resumen?.total || !useCartStore.getState().lineas.length || (tipo === 'salon' && !mesa) || (tipo === 'delivery' && (!cliente || !direccion))} onClick={() => { setError(''); setConfirmar(true) }}>Registrar pedido</BotonSecundario>
    {error && !confirmar && <p role="alert" className="text-app-error">{error}</p>}
    </div>
    {confirmar && <Modal titulo="Confirmar registro del pedido" bloqueado={ocupado} onCerrar={() => setConfirmar(false)}><div className="space-y-4"><p>Total estimado: S/ {consulta.resumen?.total}. El servidor comprobará precios, receta y existencias.</p><p>Esta acción registra la preparación. El carrito se conserva hasta confirmar el pago.</p>{error && <p role="alert" className="text-app-error">{error}</p>}<div className="flex flex-wrap gap-3"><BotonBase disabled={ocupado} onClick={() => setConfirmar(false)}>Volver a revisar</BotonBase><BotonSecundario disabled={bloqueado} onClick={registrar}>{ocupado ? 'Registrando…' : 'Confirmar registro'}</BotonSecundario></div></div></Modal>}
  </div>
}
