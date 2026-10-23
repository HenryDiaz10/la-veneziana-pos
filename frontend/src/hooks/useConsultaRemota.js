import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth.store.js'
import { ErrorApi } from '../services/api.js'

// Cancelar y descartar respuestas anteriores evita mezclar productos o variantes.
export default function useConsultaRemota(cargar, solicitud, { conservarDatos = false, claveDatos = cargar } = {}) {
  const [resultado, setResultado] = useState({ solicitud: null, datos: null, error: '' })
  // Cada intento invalida el resultado anterior sin mostrar precios obsoletos.
  const [intento, setIntento] = useState(0)
  const reintentar = useCallback(() => setIntento(actual => actual + 1), [])
  const comprobarSesion = useAuthStore(s => s.comprobarSesion)
  useEffect(() => {
    if (!solicitud) return
    const controlador = new AbortController()
    Promise.resolve().then(() => cargar(solicitud, controlador.signal)).then(datos => {
      if (!controlador.signal.aborted) setResultado({ solicitud, intento, claveDatos, datos, error: '' })
    }).catch(error => {
      if (controlador.signal.aborted) return
      setResultado({ solicitud, intento, claveDatos, datos: null, error: error instanceof ErrorApi ? error.message : 'No se pudo cargar la información. Inténtalo nuevamente.' })
      if (error instanceof ErrorApi && error.estado === 401) void comprobarSesion()
    })
    return () => controlador.abort()
  }, [cargar, solicitud, comprobarSesion, intento, claveDatos])
  const mismoRecurso = resultado.claveDatos === claveDatos
  const actual = Boolean(solicitud) && mismoRecurso && resultado.solicitud === solicitud && resultado.intento === intento
  // Solo los listados optan por conservar su presentación. Los detalles y
  // precios siguen invalidándose, y nunca se mezclan recursos distintos.
  const conservar = Boolean(solicitud) && conservarDatos && mismoRecurso
  return { datos: actual || conservar ? resultado.datos : null, error: actual ? resultado.error : '', pendiente: Boolean(solicitud && !actual), reintentar }
}
