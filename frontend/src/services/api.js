import { API_URL } from '../config/env.js'

// Error controlado para distinguir rechazos HTTP y fallos de conexión.
export class ErrorApi extends Error {
  constructor(estado, mensaje, codigo = '') {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
  }
}

const METODOS_PERMITIDOS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
])

export async function solicitarApi(
  ruta,
  {
    metodo = 'GET',
    datos,
    signal,
    claveIdempotencia,
    timeoutMs = 10000
  } = {}
) {
  // Recibir rutas internas como /auth/login.
  if (
    typeof ruta !== 'string' ||
    !ruta.startsWith('/') ||
    ruta.startsWith('//') ||
    /[\\#\r\n]/.test(ruta)
  ) {
    throw new TypeError('La ruta de la API no es válida.')
  }

  if (!METODOS_PERMITIDOS.has(metodo)) {
    throw new TypeError('El método HTTP no está permitido.')
  }

  if (metodo === 'GET' && datos !== undefined) {
    throw new TypeError('Las consultas GET no deben enviar un cuerpo.')
  }

  const headers = {
    Accept: 'application/json'
  }
  if (claveIdempotencia !== undefined) {
    if (metodo === 'GET' || typeof claveIdempotencia !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(claveIdempotencia)) throw new TypeError('Clave de operación no válida.')
    headers['Idempotency-Key'] = claveIdempotencia
  }

  if (metodo !== 'GET') {
    headers['X-CSRF-Protection'] = '1'
  }

  if (datos !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let respuesta

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,

      // Permitir que el navegador envíe y reciba la cookie HttpOnly.
      credentials: 'include',

      cache: 'no-store',
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),

      body: datos === undefined
        ? undefined
        : JSON.stringify(datos)
    })
  } catch (error) {
    // Conservar las cancelaciones para que el consumidor las gestione.
    if (error.name === 'AbortError') {
      throw error
    }

    throw new ErrorApi(
      0,
      'No se pudo conectar con el servidor. Inténtalo nuevamente.'
    )
  }

  // Logout y otras operaciones pueden responder sin cuerpo.
  if (respuesta.status === 204) {
    return null
  }

  const esJson = (
    respuesta.headers.get('Content-Type') ?? ''
  ).toLowerCase().includes('application/json')

  let contenido = null

  if (esJson) {
    try {
      contenido = await respuesta.json()
    } catch {
      throw new ErrorApi(
        respuesta.status,
        'El servidor devolvió una respuesta no válida.'
      )
    }
  }

  if (!respuesta.ok) {
    // Utilizar únicamente el mensaje público previsto por el backend.
    const mensaje = typeof contenido?.mensaje === 'string'
      ? contenido.mensaje
      : 'No se pudo completar la solicitud.'

    throw new ErrorApi(respuesta.status, mensaje, typeof contenido?.codigo === 'string' ? contenido.codigo : '')
  }

  if (!esJson) {
    throw new ErrorApi(
      respuesta.status,
      'El servidor devolvió una respuesta no válida.'
    )
  }

  return contenido
}
