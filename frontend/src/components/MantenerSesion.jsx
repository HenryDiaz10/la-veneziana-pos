import { useEffect } from 'react'
import { useAuthStore } from '../stores/auth.store.js'

// Comprobar sesión y permisos también en segundo plano, sin exigir interacción.
// Las ocho horas las garantiza el servidor, incluso si el navegador se suspende.
export default function MantenerSesion() {
  const estado = useAuthStore(s => s.estado)
  const usuarioId = useAuthStore(s => s.usuario?.id)
  useEffect(() => {
    if (estado !== 'autenticado' || !usuarioId) return
    let ultimaConsulta = Date.now()

    function comprobarVigencia() {
      const ahora = Date.now()
      const sesion = useAuthStore.getState()
      if (sesion.operacion !== null ||
          sesion.estado !== 'autenticado' || sesion.usuario?.id !== usuarioId ||
          ahora - ultimaConsulta < 60000) return
      ultimaConsulta = ahora
      void sesion.comprobarSesion()
    }
    document.addEventListener('visibilitychange', comprobarVigencia)
    window.addEventListener('focus', comprobarVigencia)
    window.addEventListener('online', comprobarVigencia)
    const intervalo = window.setInterval(comprobarVigencia, 60000)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', comprobarVigencia)
      window.removeEventListener('focus', comprobarVigencia)
      window.removeEventListener('online', comprobarVigencia)
    }
  }, [estado, usuarioId])
  return null
}
