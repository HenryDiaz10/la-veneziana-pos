import { useEffect, useState } from 'react'
import { ahoraServidor } from '../utils/kds-tiempo.js'

export default function useRelojKds(muestra) {
  const [monotono, setMonotono] = useState(() => performance.now())
  useEffect(() => {
    // Un solo temporizador para todas las tarjetas; no sumar ticks por tarea.
    const actualizar = () => setMonotono(performance.now())
    const reloj = setInterval(actualizar, 1000)
    document.addEventListener('visibilitychange', actualizar)
    return () => { clearInterval(reloj); document.removeEventListener('visibilitychange', actualizar) }
  }, [])
  return { monotono, ahora: ahoraServidor(muestra, Math.max(monotono, muestra?.monotono ?? 0)) }
}
