import { solicitarApi, ErrorApi } from './api.js'

// Comprobar los identificadores antes de enviar solicitudes al servidor.
function validarId(id) {
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    id > 2147483647
  ) {
    throw new TypeError('El identificador no es válido.')
  }

  return id
}

// Consultar el catálogo operativo del POS: categorías activas y productos disponibles.
// Protegido por el permiso operativo ventas/cobrar (no requiere catalogo/gestionar).
export async function consultarCatalogoPos({
  categoriaId = null,
  busqueda = '',
  signal
} = {}) {
  const parametros = new URLSearchParams()

  if (categoriaId !== null && categoriaId !== undefined && categoriaId !== '') {
    parametros.set('categoriaId', String(validarId(Number(categoriaId))))
  }

  if (typeof busqueda === 'string' && busqueda.trim().length > 0) {
    if (busqueda.trim().length > 150) {
      throw new TypeError('La búsqueda no puede exceder 150 caracteres.')
    }
    parametros.set('busqueda', busqueda.trim())
  }

  const query = parametros.toString()
  const ruta = query ? `/pos/catalogo?${query}` : '/pos/catalogo'

  return solicitarApi(ruta, { signal })
}

// Consultar un producto activo y su configuración de venta (variantes y modificadores).
export async function consultarProductoPos(id, { signal } = {}) {
  validarId(id)
  return solicitarApi(`/pos/productos/${id}`, { signal })
}

// Consultar los datos de catálogo de todos los productos distintos que componen
// el borrador activo del carrito en el POS.
// Utiliza exclusivamente las rutas operativas protegidas por ventas/cobrar.
// Si un producto fue desactivado o eliminado, devuelve un error descriptivo para esa línea.
export async function consultarDatosBorradorPos({ ids }, signal) {
  if (!Array.isArray(ids)) {
    throw new TypeError('La lista de identificadores debe ser un arreglo.')
  }

  const resultados = {}
  const idsUnicos = [...new Set(ids)]

  for (const id of idsUnicos) {
    try {
      const respuesta = await consultarProductoPos(id, { signal })
      resultados[id] = {
        producto: respuesta.producto,
        configuracion: respuesta.configuracion
      }
    } catch (error) {
      // Un producto retirado o inactivo invalida su línea sin ocultar el resto.
      // Errores de red o de autenticación deben propagarse para permitir reintento.
      if (error instanceof ErrorApi && error.estado === 404) {
        resultados[id] = {
          error: 'El producto ya no está disponible para la venta.'
        }
      } else {
        throw error
      }
    }
  }

  return resultados
}
