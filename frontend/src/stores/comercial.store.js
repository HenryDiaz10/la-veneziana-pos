import { useMemo, useSyncExternalStore } from 'react'
import { useAuthStore } from './auth.store.js'
import { useCartStore, normalizarLineaCarrito } from './useCartStore.js'
import { solicitarApi, ErrorApi } from '../services/api.js'

const EVENTO = 'veneziana-operacion-comercial'
const VACIO = '{"pendiente":null,"vinculos":{},"ultimaVenta":null}'
const TIPOS_CAJA = ['caja.abrir', 'caja.movimiento', 'caja.cerrar', 'caja.copia']
const TIPOS = ['pedido.crear', 'pedido.bloquear_pago', 'pedido.liberar_pago', 'pedido.cobrar', ...TIPOS_CAJA]
const clave = id => `la-veneziana-comercial-v1:${id}`
function propietario(id) {
  const s = useAuthStore.getState()
  if (!Number.isSafeInteger(id) || id <= 0 || s.estado !== 'autenticado' || s.usuario?.id !== id) throw new Error('La sesión cambió. Vuelve a consultar la operación con su propietario.')
}
function leer(id) {
  const raw = localStorage.getItem(clave(id)) ?? VACIO
  if (raw.length > 40000) throw new Error('El registro local de operaciones requiere revisión.')
  const r = JSON.parse(raw)
  if (!r || !r.vinculos || typeof r.vinculos !== 'object' || Array.isArray(r.vinculos) ||
    Object.keys(r.vinculos).length > 100 || Object.entries(r.vinculos).some(([id, v]) => !/^[1-9]\d{0,18}$/.test(id) || !Array.isArray(v?.origen)) ||
    (r.pendiente && (!/^[a-zA-Z0-9_-]{8,64}$/.test(r.pendiente.clave) || !TIPOS.includes(r.pendiente.tipo)))) throw new Error('El registro local de operaciones requiere revisión.')
  return r
}
function guardar(id, datos) {
  const raw = JSON.stringify(datos)
  if (raw.length > 40000) throw new Error('El registro local supera el límite permitido.')
  localStorage.setItem(clave(id), raw)
  if (localStorage.getItem(clave(id)) !== raw) throw new Error('No se pudo guardar la identidad de la operación. No se enviará otra operación.')
  window.dispatchEvent(new Event(EVENTO))
}
function suscribir(fn) {
  window.addEventListener('storage', fn); window.addEventListener(EVENTO, fn)
  return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENTO, fn) }
}
export function useComercial(id) {
  const raw = useSyncExternalStore(suscribir, () => {
    if (!id) return VACIO
    try { return JSON.stringify(leer(id)) }
    catch { return '{"error":"No se puede recuperar el registro de operaciones. Revisa el almacenamiento antes de vender.","vinculos":{}}' }
  })
  return useMemo(() => JSON.parse(raw), [raw])
}
async function huella(linea) {
  const { productoId, varianteId, modificadoresIds, cantidad, indicaciones } = linea
  const bytes = new TextEncoder().encode(JSON.stringify(normalizarLineaCarrito({ productoId, varianteId, modificadoresIds, cantidad, indicaciones })))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('')
}
export const capturarOrigen = lineas => Promise.all(lineas.map(async l => ({ id: l.id, huella: await huella(l) })))
async function limpiarConfirmadas(id, origen) {
  propietario(id)
  const c = useCartStore.getState()
  if (!c.carritoPreparado || c.usuarioCarritoId !== id) throw new Error('Espera a que se recupere tu carrito y vuelve a recuperar el cobro confirmado.')
  const lineas = c.lineas
  const comparadas = await Promise.all(lineas.map(async l => ({ linea: l, huella: await huella(l) })))
  propietario(id)
  const quitar = new Set(comparadas.filter(c => origen.some(o => o.id === c.linea.id && o.huella === c.huella)).map(c => c.linea))
  useCartStore.setState(actual => actual.usuarioCarritoId === id && actual.carritoPreparado ? { lineas: actual.lineas.filter(l => !quitar.has(l)) } : {})
}
function rutaRecuperacion(p) {
  if (TIPOS_CAJA.includes(p.tipo)) return `/caja/operaciones/${p.tipo}/${p.clave}`
  return `/pedidos/operaciones/${p.tipo}/${p.clave}`
}
async function finalizar(id, pendiente, resultado) {
  propietario(id)
  const r = leer(id)
  if (r.pendiente?.clave !== pendiente.clave) throw new Error('La operación local cambió. Recupera su resultado antes de continuar.')
  if (!resultado.cancelada) {
    if (TIPOS_CAJA.includes(pendiente.tipo)) {
      const recurso = resultado.cierre ?? resultado.movimiento ?? resultado.copia ?? resultado.sesion
      const sesionId = recurso?.sesion_id ?? recurso?.id
      if (!Number.isSafeInteger(sesionId) || sesionId <= 0 || (pendiente.sesionId && sesionId !== pendiente.sesionId) ||
        (pendiente.tipo === 'caja.cerrar' && (resultado.cierre?.estado !== 'cerrada' || !resultado.cierre.snapshot?.cierre))) throw new Error('Resultado de caja incompleto. Recupera la misma operación.')
      // Solo referencias de navegación. El conteo, observaciones y memento se
      // consultan en el servidor; nunca se guardan como prueba local de cierre.
      r.ultimaOperacionCaja = { clave: pendiente.clave, tipo: pendiente.tipo, sesionId }
      if (pendiente.tipo === 'caja.cerrar') r.ultimoCierre = { sesionId }
      const impresion = recurso.impresion
      if (impresion?.job_uid) r.ultimoTrabajoCaja = { sesionId, job_uid: impresion.job_uid, numero_copia: impresion.numero_copia ?? 0 }
    }
    if (pendiente.tipo === 'pedido.crear') {
      if (!resultado.pedido?.id) throw new Error('Respuesta sin identidad de pedido. Recupera el resultado.')
      r.vinculos[resultado.pedido.id] = { origen: pendiente.origen, codigo: resultado.pedido.codigo_pedido }
    }
    if (pendiente.tipo === 'pedido.cobrar') {
      if (!resultado.venta?.id || resultado.pedido?.estado_cuenta !== 'pagada' || String(resultado.venta.pedido_id) !== pendiente.pedidoId) throw new Error('Respuesta de cobro incompleta. No se limpiará el carrito.')
      // El journal permanece pendiente hasta finalizar esta limpieza. Si cae el
      // proceso, recuperar vuelve a intentarla sin volver a cobrar.
      await limpiarConfirmadas(id, pendiente.origen ?? [])
      delete r.vinculos[pendiente.pedidoId]
      r.ultimaVenta = { id: String(resultado.venta.id), pedidoId: pendiente.pedidoId, total: resultado.venta.total,
        codigo: resultado.venta.serie_correlativo, impresion: resultado.venta.impresion ?? null }
    }
  }
  r.pendiente = null
  guardar(id, r)
  return resultado
}
async function exclusividad(id, fn) {
  if (!navigator.locks) throw new Error('Este navegador no puede proteger las operaciones entre pestañas. Usa un navegador actualizado.')
  return navigator.locks.request(`veneziana-comercial-${id}`, { ifAvailable: true }, lock => {
    if (!lock) throw new Error('Hay otra operación de este usuario en curso. Espera antes de continuar.')
    propietario(id)
    return fn()
  })
}
export function ejecutarComercial({ tipo, ruta, cuerpo, pedidoId = null, origen = [], sesionId = null }) {
  if (!TIPOS.includes(tipo)) return Promise.reject(new Error('Tipo de operación no permitido.'))
  const id = useAuthStore.getState().usuario?.id
  return exclusividad(id, async () => {
    const registro = leer(id)
    if (registro.pendiente) throw new Error('Recupera la operación pendiente antes de enviar otra.')
    const p = { tipo, clave: crypto.randomUUID(), pedidoId, sesionId, origen: tipo === 'pedido.cobrar' ? registro.vinculos[pedidoId]?.origen ?? [] : origen }
    // Se conserva solo identidad y huellas: nunca cuerpo, referencias bancarias,
    // credenciales ni pagos. Si guardar falla, no se manda el POST.
    guardar(id, { ...registro, pendiente: p })
    try {
      const resultado = await solicitarApi(ruta, { metodo: 'POST', datos: cuerpo, claveIdempotencia: p.clave })
      return await finalizar(id, p, resultado)
    } catch (e) {
      if (e instanceof ErrorApi && e.estado >= 400 && e.estado < 500 && e.codigo !== 'IDEMPOTENCIA_EN_CONFLICTO') {
        propietario(id)
        const actual = leer(id)
        if (actual.pendiente?.clave === p.clave) guardar(id, { ...actual, pendiente: null })
        if (e.estado === 401) void useAuthStore.getState().comprobarSesion()
        throw e
      }
      throw new Error('No se conoce el resultado de la operación. Conservamos su identidad y el carrito; usa Recuperar resultado.', { cause: e })
    }
  })
}
export function recuperarComercial(resolver = false) {
  const id = useAuthStore.getState().usuario?.id
  return exclusividad(id, async () => {
    const p = leer(id).pendiente
    if (!p) return null
    try {
      const resultado = await solicitarApi(rutaRecuperacion(p) + (resolver ? '/resolver' : ''), resolver ? { metodo: 'POST', datos: {} } : {})
      return await finalizar(id, p, resultado)
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) throw new Error('Todavía no hay confirmación. Consulta otra vez o resuelve el intento de forma segura.', { cause: e })
      throw e
    }
  })
}
// Otro cajero puede haber cobrado el pedido. Consultar su estado oficial permite
// retirar el borrador original sin enviar un nuevo cobro ni usar datos locales como prueba.
export function reconciliarCobro(pedidoId) {
  const id = useAuthStore.getState().usuario?.id
  return exclusividad(id, async () => {
    const r = leer(id)
    if (r.pendiente) throw new Error('Recupera primero la operación pendiente.')
    const resultado = await solicitarApi(`/pedidos/${pedidoId}/contexto-pago`)
    if (resultado.pedido?.estado_cuenta !== 'pagada' || String(resultado.venta?.pedido_id) !== pedidoId) throw new Error('El pedido aún no tiene un cobro confirmado.')
    propietario(id)
    const p = { tipo: 'pedido.cobrar', clave: crypto.randomUUID(), pedidoId, origen: r.vinculos[pedidoId]?.origen ?? [] }
    guardar(id, { ...r, pendiente: p })
    return finalizar(id, p, resultado)
  })
}
