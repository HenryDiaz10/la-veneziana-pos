import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth.store.js'
import { ErrorApi } from '../services/api.js'

// Cancelar consultas anteriores e impedir que una respuesta tardía muestre
// datos de otro cliente. No almacenar información personal en persistencia.
export default function useConsultaClientes(cargar, solicitud) {
  const [resultado, setResultado] = useState({ solicitud: null, datos: null, error: '' })
  const comprobarSesion = useAuthStore(s => s.comprobarSesion)
  useEffect(() => {
    if (!solicitud) return
    const controlador = new AbortController()
    Promise.resolve().then(() => cargar(solicitud, controlador.signal)).then(datos => {
      if (!controlador.signal.aborted) setResultado({ solicitud, datos, error: '' })
    }).catch(error => {
      if (controlador.signal.aborted) return
      setResultado({ solicitud, datos: null, error: error instanceof ErrorApi ? error.message : 'No se pudo cargar la información. Inténtalo nuevamente.' })
      if (error instanceof ErrorApi && error.estado === 401) void comprobarSesion()
    })
    return () => controlador.abort()
  }, [cargar, solicitud, comprobarSesion])
  const actual = resultado.solicitud === solicitud
  return { datos: actual ? resultado.datos : null, error: actual ? resultado.error : '', pendiente: Boolean(solicitud && !actual) }
}
