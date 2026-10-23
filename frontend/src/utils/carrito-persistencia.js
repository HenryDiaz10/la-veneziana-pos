import {
  normalizarLineaCarrito
} from '../stores/useCartStore.js'

// Identifica el formato del borrador guardado.
// Si cambia su estructura, podremos cambiar esta versión.
const VERSION = 1

// Evita procesar archivos locales excesivamente grandes.
const MAX_CARACTERES = 100000

// Cada línea utiliza el UUID generado por agregarLinea.
const UUID_VALIDO =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

function obtenerClave(usuarioId) {
  // El identificador debe proceder de la sesión comprobada.
  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0 ||
    usuarioId > 2147483647
  ) {
    throw new Error('El usuario del carrito no es válido.')
  }

  // Separamos los borradores de los empleados que usan el equipo.
  // No guardamos contraseñas, tokens ni el objeto de sesión.
  return `la-veneziana-carrito-v${VERSION}:${usuarioId}`
}

function prepararLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length > 100) {
    throw new Error('El borrador del carrito no es válido.')
  }

  const identificadores = new Set()

  return lineas.map(linea => {
    if (
      linea === null ||
      typeof linea !== 'object' ||
      typeof linea.id !== 'string' ||
      !UUID_VALIDO.test(linea.id)
    ) {
      throw new Error('Una línea del borrador no es válida.')
    }

    const id = linea.id.toLowerCase()

    if (identificadores.has(id)) {
      throw new Error('El borrador contiene líneas repetidas.')
    }

    identificadores.add(id)

    // Volvemos a validar producto, variante, modificadores y cantidad.
    const seleccion = normalizarLineaCarrito({
      productoId: linea.productoId,
      varianteId: linea.varianteId,
      modificadoresIds: linea.modificadoresIds,
      cantidad: linea.cantidad,
      indicaciones: linea.indicaciones
    })

    // Construimos una lista explícita de campos permitidos.
    // Cualquier otro dato del objeto original queda fuera.
    return {
      id,
      ...seleccion
    }
  })
}

export function leerCarritoGuardado(usuarioId) {
  try {
    const clave = obtenerClave(usuarioId)
    const contenido = localStorage.getItem(clave)

    // Es normal que un empleado todavía no tenga un borrador.
    if (contenido === null) {
      return { lineas: [], aviso: '' }
    }

    if (contenido.length > MAX_CARACTERES) {
      throw new Error('El borrador supera el tamaño permitido.')
    }

    const borrador = JSON.parse(contenido)

    if (
      borrador === null ||
      typeof borrador !== 'object' ||
      borrador.version !== VERSION
    ) {
      throw new Error('El formato del borrador no es compatible.')
    }

    return {
      lineas: prepararLineas(borrador.lineas),
      aviso: ''
    }
  } catch {
    // Un borrador dañado o el almacenamiento bloqueado
    // no deben impedir que la aplicación siga funcionando.
    return {
      lineas: [],
      aviso: 'No se pudo recuperar el carrito guardado.'
    }
  }
}

export function guardarCarrito(usuarioId, lineas) {
  try {
    const clave = obtenerClave(usuarioId)

    const contenido = JSON.stringify({
      version: VERSION,
      lineas: prepararLineas(lineas)
    })

    if (contenido.length > MAX_CARACTERES) {
      throw new Error('El borrador supera el tamaño permitido.')
    }

    localStorage.setItem(clave, contenido)

    return {
      guardado: true,
      aviso: ''
    }
  } catch {
    // Puede fallar por espacio insuficiente o restricciones
    // del navegador. El carrito en memoria seguirá disponible.
    return {
      guardado: false,
      aviso: 'No se pudo guardar el carrito en este navegador.'
    }
  }
}
