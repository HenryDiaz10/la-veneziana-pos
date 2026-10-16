import { solicitarApi } from './api.js'

// Comprobar los identificadores antes de construir una ruta.
function validarId(id) {
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    id > 2147483647
  ) {
    throw new TypeError('El identificador no es válido.')
  }

  return id
}

// Compartir la construcción de consultas paginadas.
// La API vuelve a comprobar estos valores.
function consultarPagina(
  recurso,
  { pagina = 1, limite = 20, signal, busqueda = '' } = {}
) {
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    throw new TypeError('La paginación no es válida.')
  }

  const parametros = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite)
  })

  if (typeof busqueda !== 'string' || [...busqueda.trim()].length > 150) {
    throw new TypeError('La búsqueda no es válida.')
  }
  if (busqueda.trim()) parametros.set('busqueda', busqueda.trim())

  return solicitarApi(`${recurso}?${parametros}`, { signal })
}

// Devolver categorías y paginación.
// Las páginas adicionales se solicitarán cuando se necesiten.
export function consultarCategorias(opciones) {
  return consultarPagina('/categorias', opciones)
}

// Devolver productos y paginación para alimentar DataTable.
export function consultarProductos(opciones) {
  return consultarPagina('/productos', opciones)
}

export function registrarCategoria(datos) {
  return solicitarApi('/categorias', {
    metodo: 'POST',
    datos
  })
}

export function editarCategoria(categoriaId, datos) {
  return solicitarApi(`/categorias/${validarId(categoriaId)}`, {
    metodo: 'PATCH',
    datos
  })
}

// Conservar los precios como texto decimal al enviar el formulario.
export function registrarProducto(datos) {
  return solicitarApi('/productos', {
    metodo: 'POST',
    datos
  })
}

export function editarProducto(productoId, datos) {
  return solicitarApi(`/productos/${validarId(productoId)}`, {
    metodo: 'PATCH',
    datos
  })
}

// El servidor comprueba relaciones antes de cualquier eliminación definitiva.
export function eliminarProducto(productoId) {
  return solicitarApi(`/productos/${validarId(productoId)}`, {
    metodo: 'DELETE', datos: { confirmar: true }
  })
}

export function eliminarCategoria(categoriaId) {
  return solicitarApi(`/categorias/${validarId(categoriaId)}`, {
    metodo: 'DELETE', datos: { confirmar: true }
  })
}
