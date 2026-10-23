import {
  aCentimos,
  desdeCentimos,
  calcularLineaCarrito
} from './carrito-calculo.js'

import {
  normalizarLineaCarrito
} from '../stores/useCartStore.js'

// Validar y estimar una selección utilizando información
// recién consultada. No modifica el borrador ni reserva stock.
export function estimarSeleccionCarrito({
  producto,
  configuracion,
  seleccion
}) {
  const linea = normalizarLineaCarrito(seleccion)

  // Producto y configuración deben pertenecer a la misma selección.
  if (
    producto?.id !== linea.productoId ||
    configuracion?.productoId !== linea.productoId
  ) {
    throw new Error('La información no corresponde al producto.')
  }

  if (producto.estado !== 'activo') {
    throw new Error('El producto ya no está activo.')
  }

  const { variantes, grupos } = configuracion

  if (!Array.isArray(variantes) || !Array.isArray(grupos)) {
    throw new Error('La configuración del producto está incompleta.')
  }

  const variante = linea.varianteId === null
    ? null
    : variantes.find(elemento => elemento.id === linea.varianteId)

  // Una variante eliminada no debe convertirse silenciosamente
  // en la presentación base.
  if (linea.varianteId !== null && !variante) {
    throw new Error('La variante guardada ya no está disponible.')
  }

  const idsElegidos = new Set(linea.modificadoresIds)
  const opcionesElegidas = []
  const idsEncontrados = new Set()

  for (const grupo of grupos) {
    if (!Array.isArray(grupo.opciones)) {
      throw new Error('No se pudieron recuperar las opciones del grupo.')
    }

    const elegidas = grupo.opciones.filter(
      opcion => idsElegidos.has(opcion.id)
    )

    if (grupo.es_obligatorio && elegidas.length === 0) {
      throw new Error(
        `Selecciona una opción de «${grupo.nombre_grupo}».`
      )
    }

    if (!grupo.es_multiple && elegidas.length > 1) {
      throw new Error(
        `«${grupo.nombre_grupo}» admite una sola opción.`
      )
    }

    for (const opcion of elegidas) {
      // Comprobar también la relación entre opción y grupo.
      if (
        opcion.grupo_id !== grupo.id ||
        idsEncontrados.has(opcion.id)
      ) {
        throw new Error('La configuración de modificadores no es válida.')
      }

      idsEncontrados.add(opcion.id)
      opcionesElegidas.push(opcion)
    }
  }

  // Detectar extras eliminados o retirados de este producto.
  if (idsEncontrados.size !== idsElegidos.size) {
    throw new Error('Algún modificador guardado ya no está disponible.')
  }

  const importes = calcularLineaCarrito({
    precioBase: producto.precio_venta_base,
    adicionalVariante: variante?.precio_adicional ?? '0.00',
    adicionales: opcionesElegidas.map(
      opcion => opcion.precio_adicional
    ),
    cantidad: linea.cantidad
  })

  // Estos datos se utilizan para mostrar el resumen en memoria.
  // El almacenamiento local sigue conservando solo la selección.
  return {
    productoNombre: producto.nombre,
    varianteNombre: variante?.nombre_variante ??
      variantes.find(elemento => elemento.precio_adicional === '0.00')?.nombre_variante ?? 'Presentación base',
    modificadoresNombres: opcionesElegidas.map(
      opcion => opcion.nombre_modificador
    ),
    cantidad: linea.cantidad,
    ...(linea.indicaciones ? { indicaciones: linea.indicaciones } : {}),
    ...importes
  }
}

// Sumar únicamente cuando todas las líneas tienen una estimación.
// Una línea pendiente o inválida impide presentar un total completo.
export function sumarEstimacionesCarrito(estimaciones) {
  if (!Array.isArray(estimaciones) || estimaciones.length > 100) {
    throw new Error('La colección de estimaciones no es válida.')
  }

  const totalCentimos = estimaciones.reduce((acumulado, estimacion) => {
    if (!estimacion || typeof estimacion.total !== 'string') {
      throw new Error('Hay líneas pendientes de validar.')
    }

    return acumulado + aCentimos(estimacion.total)
  }, 0n)

  return desdeCentimos(totalCentimos)
}

// Evaluar todas las líneas recuperadas, sin perder las que requieren corrección.
// Nunca sumar un subconjunto y presentarlo como total del carrito completo.
export function estimarBorrador(lineas, catalogo) {
  const resultados = lineas.map(linea => {
    try {
      const datos = catalogo[linea.productoId]
      if (!datos || datos.error) throw new Error(datos?.error ?? 'Falta consultar el producto.')
      const estimacion = estimarSeleccionCarrito({
        ...datos,
        seleccion: {
          productoId: linea.productoId, varianteId: linea.varianteId,
          modificadoresIds: linea.modificadoresIds, cantidad: linea.cantidad, indicaciones: linea.indicaciones
        }
      })
      return { id: linea.id, ...estimacion }
    } catch (error) {
      return { id: linea.id, error: error instanceof Error ? error.message : 'Línea no válida.' }
    }
  })
  let total = null
  let errorTotal = ''
  if (resultados.some(linea => linea.error)) {
    errorTotal = 'Corrige las líneas indicadas para calcular el total estimado.'
  } else {
    try { total = sumarEstimacionesCarrito(resultados) }
    catch { errorTotal = 'El total supera el importe permitido.' }
  }
  return { resultados, total, errorTotal }
}

// Preparar las selecciones para el futuro comando de pedido, sin enviar
// importes estimados, nombres, credenciales ni identificadores locales.
// Este paso no confirma pedidos: el servidor debe volver a validarlo todo.
export function construirComandoCarrito(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0 || lineas.length > 100) {
    throw new Error('El pedido debe contener entre 1 y 100 líneas.')
  }
  return {
    lineas: lineas.map(linea => normalizarLineaCarrito({
      productoId: linea.productoId, varianteId: linea.varianteId,
      modificadoresIds: linea.modificadoresIds, cantidad: linea.cantidad, indicaciones: linea.indicaciones
    }))
  }
}
