import { solicitarApi } from './api.js'
import { ErrorApi } from './api.js'

// Validar identificadores antes de construir las rutas.
// El backend vuelve a comprobarlos y verifica los permisos.
function validarId(id) {
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    id > 2147483647
  ) {
    throw new Error('El identificador no es válido.')
  }

  return id
}

// Recuperar todas las páginas de una colección.
// Así no desaparecen opciones cuando hay más de 50 registros.
async function consultarColeccion(ruta, campo, signal) {
  const registros = []
  const ids = new Set()
  let pagina = 1

  while (true) {
    const parametros = new URLSearchParams({
      pagina: String(pagina),
      limite: '50'
    })

    const respuesta = await solicitarApi(
      `${ruta}?${parametros}`,
      { signal }
    )

    const elementos = respuesta?.[campo]
    const totalPaginas = respuesta?.paginacion?.totalPaginas

    // No presentar una configuración incompleta como válida
    // si el servidor devuelve una respuesta inesperada.
    if (
      !Array.isArray(elementos) ||
      !Number.isSafeInteger(totalPaginas) ||
      totalPaginas < 0 ||
      totalPaginas > 10000
    ) {
      throw new Error('La respuesta del catálogo no es válida.')
    }

    for (const elemento of elementos) {
      validarId(elemento.id)

      // Una colección que cambia mientras se consulta puede repetir
      // registros entre páginas. Evitar opciones duplicadas.
      if (!ids.has(elemento.id)) {
        ids.add(elemento.id)
        registros.push(elemento)
      }
    }

    if (pagina >= totalPaginas) {
      return registros
    }

    pagina += 1
  }
}

// Consultar las variantes pertenecientes al producto seleccionado.
export function consultarVariantesCarrito(productoId, { signal } = {}) {
  return consultarColeccion(
    `/productos/${validarId(productoId)}/variantes`,
    'variantes',
    signal
  )
}

// Consultar los grupos de modificadores asignados al producto.
// No se muestran grupos que pertenecen a otros productos.
export function consultarGruposCarrito(productoId, { signal } = {}) {
  return consultarColeccion(
    `/productos/${validarId(productoId)}/modificadores`,
    'grupos',
    signal
  )
}

// Consultar las opciones de un grupo: extras, exclusiones, etc.
export function consultarOpcionesCarrito(grupoId, { signal } = {}) {
  return consultarColeccion(
    `/modificadores/${validarId(grupoId)}/items`,
    'items',
    signal
  )
}

// Preparar la configuración completa para el selector del carrito.
// Si falla alguna consulta, se informa del error en lugar de permitir
// una selección basada en información incompleta.
export async function consultarConfiguracionCarrito(
  productoId,
  { signal } = {}
) {
  validarId(productoId)

  // Variantes y grupos pueden consultarse simultáneamente.
  const [variantes, grupos] = await Promise.all([
    consultarVariantesCarrito(productoId, { signal }),
    consultarGruposCarrito(productoId, { signal })
  ])

  // Cargar las opciones de cada grupo utilizando la misma señal.
  // Al cambiar de producto, la pantalla podrá cancelar las consultas.
  const gruposConOpciones = []

  for (const grupo of grupos) {
    const opciones = await consultarOpcionesCarrito(
      grupo.id,
      { signal }
    )

    gruposConOpciones.push({
      ...grupo,
      opciones
    })
  }

  return {
    productoId,
    variantes,
    grupos: gruposConOpciones
  }
}

// Consultar una sola vez cada producto distinto, aunque haya treinta líneas.
// Las respuestas se conservan en memoria y nunca se escriben en localStorage.
export async function consultarDatosBorrador({ ids }, signal) {
  const resultados = {}
  for (const id of ids) {
    try {
      const { producto } = await solicitarApi(`/productos/${validarId(id)}`, { signal })
      const configuracion = await consultarConfiguracionCarrito(id, { signal })
      resultados[id] = { producto, configuracion }
    } catch (error) {
      // Un producto eliminado invalida su línea, sin ocultar el resto.
      // Fallos de conexión o sesión deben permitir reintentar toda la consulta.
      if (!(error instanceof ErrorApi) || error.estado !== 404) throw error
      resultados[id] = { error: 'El producto o su configuración ya no existe.' }
    }
  }
  return resultados
}
