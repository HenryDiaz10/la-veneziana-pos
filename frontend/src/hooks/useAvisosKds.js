import { useEffect, useRef, useState } from 'react'
import { crearAudioKds } from '../services/kds-audio.js'
import { preferenciasKds } from '../utils/kds-tiempo.js'
import { useAuthStore } from '../stores/auth.store.js'

export default function useAvisosKds(aviso, monotono) {
  const usuarioId = useAuthStore(s => s.usuario?.id)
  const llave = `veneziana:kds:avisos:${usuarioId}`
  const [preferencias, setPreferencias] = useState(() => {
    try { return preferenciasKds(JSON.parse(localStorage.getItem(llave))) } catch { return preferenciasKds(null) }
  })
  const [habilitado, setHabilitado] = useState(false), [errorAudio, setErrorAudio] = useState(''), [pausaHasta, setPausaHasta] = useState(0)
  const motor = useRef(null), consumido = useRef(0), activo = useRef(false)
  useEffect(() => {
    activo.current = true
    return () => { activo.current = false; void motor.current?.cerrar().catch(() => {}); motor.current = null }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(llave, JSON.stringify(preferencias)) } catch { /* Preferencias válidas durante esta visita aunque el almacenamiento esté bloqueado. */ }
    motor.current?.volumen(preferencias.volumen)
  }, [llave, preferencias])
  useEffect(() => {
    if (!aviso.numero || aviso.numero === consumido.current) return
    consumido.current = aviso.numero // También consumir los avisos silenciados: no reproducirlos después.
    if (habilitado && performance.now() >= pausaHasta && document.visibilityState === 'visible') {
      // Recoger el resultado del sistema de audio sin actualizar React dentro
      // de la ejecución síncrona del efecto ni reproducir una cola al reanudar.
      try {
        const sonado = motor.current?.sonar()
        Promise.resolve(sonado).then(ok => {
          if (activo.current && !ok && preferencias.volumen > 0) setErrorAudio('No se reprodujo el aviso: revisa el sonido o vuelve a probarlo.')
        })
      } catch { Promise.resolve().then(() => { if (activo.current) setErrorAudio('No se pudo reproducir el aviso. Los avisos visuales siguen activos.') }) }
    }
  }, [aviso, habilitado, pausaHasta, preferencias.volumen])
  async function probar() {
    try {
      motor.current ??= crearAudioKds()
      const actual = motor.current
      actual.volumen(preferencias.volumen)
      await actual.activar()
      if (!activo.current || actual !== motor.current) return
      setHabilitado(true); setErrorAudio('')
      actual.sonar() // El botón es un gesto explícito de prueba, incluso durante el silencio temporal.
    } catch (e) { if (activo.current) { setHabilitado(false); setErrorAudio(e.message) } }
  }
  return { preferencias, habilitado, errorAudio, pausado: pausaHasta > monotono, probar,
    cambiar: (clave, valor) => setPreferencias(p => preferenciasKds(clave === 'volumen' ? { ...p, volumen: valor } : { ...p, umbrales: { ...p.umbrales, [clave]: valor } })),
    silenciar: () => { motor.current?.detener(); setPausaHasta(performance.now() + 5 * 60000) },
    reanudar: () => setPausaHasta(0),
    desactivar: () => { motor.current?.detener(); setHabilitado(false) } }
}
