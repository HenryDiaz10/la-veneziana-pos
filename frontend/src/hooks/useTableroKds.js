import { useEffect, useRef, useState } from 'react'
import { snapshotKds, urlSocketKds, enviarTransicionKds } from '../services/kds.service.js'
import { mezclarTareaKds } from '../utils/kds-tablero.js'
import { useAuthStore } from '../stores/auth.store.js'
import { leerIntentoKds, guardarIntentoKds, quitarIntentoKds } from '../utils/kds-intento.js'

export default function useTableroKds() {
  const [tareas, setTareas] = useState([]), [error, setError] = useState(''), [estado, setEstado] = useState('Conectando'), [listo, setListo] = useState(false)
  const [intento, setIntento] = useState(null), [enviando, setEnviando] = useState(false)
  const control = useRef({}), ocupado = useRef(false), revision = useRef(0)
  const usuarioId = useAuthStore(s => s.usuario?.id)
  useEffect(() => {
    let activo = true, socket, reconexion, sincronizando = false, repetir = false, bloqueado = false, fallos = 0
    const abort = new AbortController(), vistos = new Set()
    Promise.resolve().then(() => {
      if (!activo) return
      try { setIntento(leerIntentoKds(usuarioId)) }
      catch (e) { bloqueado = true; setError(e.message); setListo(false) }
    })
    const acceso = e => {
      if ([401, 403].includes(e.estado)) { bloqueado = true; socket?.close(); setListo(false); setEstado('Acceso pendiente'); if (e.estado === 401) void useAuthStore.getState().comprobarSesion() }
    }
    async function sincronizar() {
      if (!activo || bloqueado) return
      if (sincronizando) { repetir = true; return }
      sincronizando = true
      do {
        repetir = false
        const actual = revision.current
        try {
          const filas = await snapshotKds(abort.signal)
          if (!activo) return
          // Una respuesta iniciada antes de un comando confirmado no lo revierte.
          if (actual !== revision.current) { repetir = true; continue }
          setTareas(filas); setListo(true); setError(''); setEstado(socket?.readyState === WebSocket.OPEN ? 'En vivo' : 'Consulta periódica')
        } catch (e) {
          if (!activo) return
          acceso(e); setError(e.message); setListo(false); setEstado('Sin actualizar')
          repetir = false
        }
      } while (repetir && activo && !bloqueado)
      sincronizando = false
    }
    function conectar() {
      if (!activo || bloqueado) return
      socket = new WebSocket(urlSocketKds())
      socket.onmessage = event => {
        try {
          const m = JSON.parse(event.data)
          if (m.protocolo !== 1) throw new Error('Protocolo desconocido')
          if (m.tipo === 'kds.conectado') { fallos = 0; void sincronizar(); return }
          if (!['pedido.cocina', 'pedido.despacho', 'kds.actualizada'].includes(m.tipo) || typeof m.event_uid !== 'string') throw new Error('Aviso no válido')
          if (vistos.has(m.event_uid)) return
          vistos.add(m.event_uid); if (vistos.size > 2000) vistos.delete(vistos.values().next().value)
          // Invalidación, nunca aplicar el payload como estado oficial.
          void sincronizar()
        } catch { void sincronizar() }
      }
      socket.onclose = () => {
        if (!activo || bloqueado) return
        setEstado('Reconectando'); setListo(false)
        void sincronizar() // Respaldo HTTP si el proxy bloquea WebSocket.
        reconexion = setTimeout(conectar, Math.min(30000, 1000 * 2 ** Math.min(fallos++, 5)))
      }
      socket.onerror = () => socket.close()
    }
    const refrescar = () => { if (document.visibilityState !== 'hidden') void sincronizar() }
    control.current = { refrescar: sincronizar, acceso, activo: () => activo }
    conectar()
    const inicial = setTimeout(sincronizar, 2000), reloj = setInterval(refrescar, 30000)
    window.addEventListener('online', refrescar); window.addEventListener('focus', refrescar); document.addEventListener('visibilitychange', refrescar)
    return () => { activo = false; abort.abort(); clearTimeout(inicial); clearTimeout(reconexion); clearInterval(reloj); socket?.close(); window.removeEventListener('online', refrescar); window.removeEventListener('focus', refrescar); document.removeEventListener('visibilitychange', refrescar) }
  }, [usuarioId])
  async function ejecutar(operacion) {
    if (ocupado.current) return
    ocupado.current = true; setEnviando(true); setIntento(operacion); setError('')
    const sesion = control.current
    try {
      // Persistir ANTES del envío permite recuperar la misma identidad tras F5.
      guardarIntentoKds(usuarioId, operacion)
      const tarea = await enviarTransicionKds(operacion)
      if (!sesion.activo()) return
      revision.current++; setTareas(t => mezclarTareaKds(t, tarea)); quitarIntentoKds(usuarioId); setIntento(null)
      void sesion.refrescar()
    } catch (e) {
      if (!sesion.activo()) return
      sesion.acceso(e); setError(e.message)
      // Los errores de red/5xx son ambiguos: reintentar EL MISMO cuerpo y clave.
      if (e.estado && e.estado < 500) { quitarIntentoKds(usuarioId); setIntento(null); void sesion.refrescar() }
    } finally { ocupado.current = false; if (sesion.activo()) setEnviando(false) }
  }
  return { tareas, error, estado, listo, intento, enviando, refrescar: () => control.current.refrescar?.(),
    enviar: (id, datos) => ejecutar({ id, datos, clave: crypto.randomUUID() }), reintentar: () => intento && ejecutar(intento) }
}
