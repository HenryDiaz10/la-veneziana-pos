import { create } from 'zustand'

const MAX_LINEAS = 100

const CAMPOS_PERMITIDOS = [
  'productoId',
  'varianteId',
  'modificadoresIds',
  'cantidad'
]

function idValido(valor) {
  return (
    Number.isSafeInteger(valor) &&
    valor > 0 &&
    valor <= 2147483647
  )
}

function comprobarCampos(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos) ||
    Object.keys(datos).some(
      campo => !CAMPOS_PERMITIDOS.includes(campo)
    )
  ) {
    throw new Error('Los datos de la línea no son válidos.')
  }
}

// Guardamos selecciones, sin credenciales ni datos del cliente.
// Los precios se consultarán para calcular la estimación.
export function normalizarLineaCarrito(datos) {
  comprobarCampos(datos)

  const {
    productoId,
    varianteId = null,
    modificadoresIds = [],
    cantidad = 1
  } = datos

  if (!idValido(productoId)) {
    throw new Error('Selecciona un producto válido.')
  }

  if (varianteId !== null && !idValido(varianteId)) {
    throw new Error('La variante no es válida.')
  }

  if (
    !Array.isArray(modificadoresIds) ||
    modificadoresIds.length > 50 ||
    modificadoresIds.some(id => !idValido(id)) ||
    new Set(modificadoresIds).size !== modificadoresIds.length
  ) {
    throw new Error('Los modificadores no son válidos o están repetidos.')
  }

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 10000
  ) {
    throw new Error('La cantidad debe estar entre 1 y 10000.')
  }

  return {
    productoId,
    varianteId,
    modificadoresIds: [...modificadoresIds].sort((a, b) => a - b),
    cantidad
  }
}

export const useCartStore = create(set => ({
  // Selecciones del borrador actual.
  lineas: [],

  // Impide utilizar el carrito antes de recuperar su contenido.
  carritoPreparado: false,

  // Identifica al propietario del carrito cargado en memoria.
  usuarioCarritoId: null,

  // Informa si el navegador no permite recuperar o guardar el borrador.
  avisoPersistencia: '',

  // Incorporar el lote completo en una sola actualización y escritura local.
  // Una validación fallida no debe dejar un grupo añadido parcialmente.
  agregarLineas: selecciones => {
    if (!Array.isArray(selecciones) || !selecciones.length || selecciones.length > MAX_LINEAS) {
      throw new Error('El grupo de líneas no es válido.')
    }
    const nuevas = selecciones.map(datos => ({
      id: crypto.randomUUID(), ...normalizarLineaCarrito(datos)
    }))
    set(estado => {
      if (estado.lineas.length + nuevas.length > MAX_LINEAS) {
        throw new Error('El carrito admite hasta 100 líneas.')
      }
      return { lineas: [...estado.lineas, ...nuevas] }
    })
  },

  agregarLinea: datos => {
    const seleccion = normalizarLineaCarrito(datos)
    const id = crypto.randomUUID()

    set(estado => {
      if (estado.lineas.length >= MAX_LINEAS) {
        throw new Error('El carrito admite hasta 100 líneas.')
      }

      return {
        lineas: [
          ...estado.lineas,
          { id, ...seleccion }
        ]
      }
    })

    return id
  },

  actualizarLinea: (id, cambios) => {
    comprobarCampos(cambios)

    set(estado => {
      const actual = estado.lineas.find(linea => linea.id === id)

      if (!actual) {
        throw new Error('La línea ya no está en el carrito.')
      }

      const seleccion = normalizarLineaCarrito({
        productoId: actual.productoId,
        varianteId: actual.varianteId,
        modificadoresIds: actual.modificadoresIds,
        cantidad: actual.cantidad,
        ...cambios
      })

      return {
        lineas: estado.lineas.map(linea =>
          linea.id === id
            ? { id, ...seleccion }
            : linea
        )
      }
    })
  },

  quitarLinea: id => {
    set(estado => ({
      lineas: estado.lineas.filter(linea => linea.id !== id)
    }))
  },

  vaciarCarrito: () => {
    set({ lineas: [] })
  }
}))
