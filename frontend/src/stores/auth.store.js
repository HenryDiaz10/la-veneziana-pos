import { create } from 'zustand'

import {
  iniciarSesion,
  obtenerSesion,
  cerrarSesion
} from '../services/auth.service.js'

import { ErrorApi } from '../services/api.js'

// Compartir la consulta inicial, incluso con StrictMode de React.
let consultaEnCurso = null
let controladorConsulta = null
// Una respuesta anterior nunca debe restaurar identidad después de logout/login.
let versionIdentidad = 0

function obtenerMensajeError(error) {
  return error instanceof ErrorApi
    ? error.message
    : 'No se pudo completar la operación. Inténtalo nuevamente.'
}

function esSesionAusente(error) {
  return error instanceof ErrorApi && error.estado === 401
}

export const useAuthStore = create((set, get) => ({
  // Guardar únicamente identidad y estado visual en memoria.
  usuario: null,
  estado: 'comprobando',
  operacion: null,
  error: '',

  // Recuperar la sesión desde la cookie al cargar la aplicación.
  comprobarSesion: () => {
    if (consultaEnCurso) {
      return consultaEnCurso
    }

    // Evitar consultas que compitan con un login o logout.
    if (get().operacion !== null) {
      return Promise.resolve()
    }

    const teniaIdentidad = get().estado === 'autenticado' && Boolean(get().usuario)
    const versionConsulta = versionIdentidad
    controladorConsulta = new AbortController()
    const signal = controladorConsulta.signal
    // Revalidar en segundo plano conserva formularios y borradores montados.
    if (!teniaIdentidad) set({ usuario: null, estado: 'comprobando', error: '' })

    consultaEnCurso = (async () => {
      try {
        const usuario = await obtenerSesion({ signal })

        if (versionConsulta !== versionIdentidad || get().operacion !== null) return

        set({
          usuario,
          estado: 'autenticado',
          error: ''
        })
      } catch (error) {
        if (versionConsulta !== versionIdentidad || get().operacion !== null) return
        if (esSesionAusente(error)) {
          // No tener una sesión al abrir la página es normal.
          set({
            usuario: null,
            estado: 'sin_sesion',
            error: teniaIdentidad ? 'La sesión venció o dejó de estar disponible. Vuelve a ingresar.' : ''
          })
        } else {
          // Un fallo de conexión no equivale a credenciales inválidas.
          // Mantener la pantalla al fallar la red; el backend sigue autorizando
          // cada operación. Solo un 401 confirmado retira una sesión existente.
          set(teniaIdentidad ? { error: obtenerMensajeError(error) } : {
            usuario: null, estado: 'error', error: obtenerMensajeError(error)
          })
        }
      } finally {
        consultaEnCurso = null
        controladorConsulta = null
      }
    })()

    return consultaEnCurso
  },

  // Enviar las credenciales sin conservarlas en el estado.
  ingresar: async (credenciales) => {
    if (
      get().operacion !== null ||
      !['sin_sesion', 'error'].includes(get().estado)
    ) {
      return false
    }

    versionIdentidad++
    controladorConsulta?.abort()
    set({
      operacion: 'login',
      error: ''
    })

    try {
      const usuario = await iniciarSesion(credenciales)

      set({
        usuario,
        estado: 'autenticado',
        operacion: null,
        error: ''
      })

      return true
    } catch (error) {
      set({
        usuario: null,
        estado: 'sin_sesion',
        operacion: null,
        error: obtenerMensajeError(error)
      })

      return false
    }
  },

  // Confirmar el cierre en el backend antes de retirar la identidad.
  salir: async () => {
    if (
      get().operacion !== null ||
      get().estado !== 'autenticado'
    ) {
      return false
    }

    versionIdentidad++
    // Cancelar antes del logout evita recibir luego una cookie renovada vieja.
    controladorConsulta?.abort()
    set({
      operacion: 'logout',
      error: ''
    })

    try {
      await cerrarSesion()
    } catch (error) {
      // Si ya venció la sesión, podemos mostrar el login.
      if (!esSesionAusente(error)) {
        // Conservar la identidad si no se pudo confirmar el cierre.
        set({
          operacion: null,
          error: obtenerMensajeError(error)
        })

        return false
      }
    }

    set({
      usuario: null,
      estado: 'sin_sesion',
      operacion: null,
      error: ''
    })

    return true
  }
}))
