import { useEffect, useRef } from 'react'

import { useAuthStore } from '../stores/auth.store.js'
import { useCartStore } from '../stores/useCartStore.js'

import {
  leerCarritoGuardado,
  guardarCarrito
} from '../utils/carrito-persistencia.js'

// Este componente conecta sesión, carrito y almacenamiento.
// No muestra elementos en la pantalla.
export default function SincronizadorCarrito() {
  const estado = useAuthStore(state => state.estado)
  const usuarioId = useAuthStore(state => state.usuario?.id ?? null)

  // Recuerda qué usuario tiene cargado su borrador.
  // Evita recuperar otra vez una versión anterior mientras trabaja.
  const propietarioRef = useRef(null)

  useEffect(() => {
    if (estado === 'sin_sesion') {
      propietarioRef.current = null

      // Al cerrar sesión, retiramos el carrito de la memoria.
      // El borrador local permanece disponible para su propietario.
      useCartStore.setState({
        lineas: [],
        carritoPreparado: false,
        usuarioCarritoId: null,
        avisoPersistencia: ''
      })

      return
    }

    if (estado !== 'autenticado' || usuarioId === null) {
      // Mientras se comprueba la sesión o existe un error de conexión,
      // no guardamos cambios ni presentamos el carrito como preparado.
      // Conservamos la memoria para no perderla si falla localStorage.
      useCartStore.setState({
        carritoPreparado: false
      })

      return
    }

    if (propietarioRef.current !== usuarioId) {
      // Recuperar solamente el borrador del usuario autenticado.
      const resultado = leerCarritoGuardado(usuarioId)

      useCartStore.setState({
        lineas: resultado.lineas,
        carritoPreparado: true,
        usuarioCarritoId: usuarioId,
        avisoPersistencia: resultado.aviso
      })

      propietarioRef.current = usuarioId
    } else {
      // Si se recuperó la misma sesión, conservamos el carrito
      // en memoria en lugar de cargar una copia local más antigua.
      useCartStore.setState({
        carritoPreparado: true
      })
    }

    // Suscribir después de recuperar el borrador evita sobrescribirlo
    // con el carrito vacío que existía al iniciar la aplicación.
    const cancelarSuscripcion = useCartStore.subscribe(
      (actual, anterior) => {
        // Cambiar un aviso no requiere guardar nuevamente las líneas.
        if (actual.lineas === anterior.lineas) {
          return
        }

        const sesion = useAuthStore.getState()

        // Comprobar la sesión vigente justo antes de escribir.
        // Así no guardamos el carrito bajo otro usuario.
        if (
          sesion.estado !== 'autenticado' ||
          sesion.usuario?.id !== usuarioId ||
          actual.usuarioCarritoId !== usuarioId ||
          !actual.carritoPreparado
        ) {
          return
        }

        const resultado = guardarCarrito(
          usuarioId,
          actual.lineas
        )

        // Conservar el aviso permitirá informar si el navegador
        // bloquea el almacenamiento o se queda sin espacio.
        if (actual.avisoPersistencia !== resultado.aviso) {
          useCartStore.setState({
            avisoPersistencia: resultado.aviso
          })
        }
      }
    )

    // Retirar la suscripción al cambiar de sesión o desmontar.
    // Evita escrituras repetidas y suscripciones acumuladas.
    return () => {
      cancelarSuscripcion()
    }
  }, [estado, usuarioId])

  return null
}