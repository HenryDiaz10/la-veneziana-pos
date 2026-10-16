import { solicitarApi } from './api.js'
import { consultarProductos } from './catalogo.service.js'

const idValido = id => {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new TypeError('Identificador de receta no válido.')
  return id
}
export const buscarProductosReceta = (s, signal) => consultarProductos({ ...s, signal })
export function consultarInsumosReceta({ pagina = 1, busqueda = '' }, signal) {
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000 || typeof busqueda !== 'string' || [...busqueda].length > 150) throw new TypeError('Consulta de insumos no válida.')
  return solicitarApi(`/recetas/insumos?${new URLSearchParams({ pagina: String(pagina), limite: '20', busqueda })}`, { signal })
}
export function consultarReceta(productoId, varianteId, signal) {
  const query = varianteId === null ? '' : `?variante_id=${idValido(varianteId)}`
  return solicitarApi(`/recetas/productos/${idValido(productoId)}${query}`, { signal })
}
export async function cargarConstructorReceta({ productoId, varianteId }, signal) {
  const [actual, base] = await Promise.all([
    consultarReceta(productoId, varianteId, signal),
    varianteId === null ? Promise.resolve(null) : consultarReceta(productoId, null, signal)
  ])
  return { producto: actual.producto, receta: actual.receta, base: base?.receta ?? actual.receta }
}
export function consultarVariantesReceta({ productoId, pagina }, signal) {
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000) throw new TypeError('Página no válida.')
  return solicitarApi(`/productos/${idValido(productoId)}/variantes?pagina=${pagina}&limite=20`, { signal })
}
export function guardarReceta(productoId, datos) {
  return solicitarApi(`/recetas/productos/${idValido(productoId)}`, { metodo: 'PUT', datos })
}
