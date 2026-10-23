import { aCentimos } from './carrito-calculo.js'

// Es una etiqueta de preparación, no una resta monetaria ni un descuento.
export const etiquetaModificador = opcion => `${opcion.es_exclusion === true ? 'Excluir: ' : ''}${opcion.nombre}`

// Validar toda la configuración, incluso las opciones no seleccionadas.
// Los contratos antiguos pueden omitir la marca; nunca interpretar "false" como true.
export function validarGruposModificadores(grupos) {
  if (!Array.isArray(grupos)) throw new Error('La configuración de modificadores no es válida.')
  const idsGrupos = new Set(), idsOpciones = new Set()
  for (const g of grupos) {
    if (!Number.isSafeInteger(g.id) || g.id <= 0 || idsGrupos.has(g.id) || typeof g.nombre_grupo !== 'string' || !g.nombre_grupo.trim() ||
      typeof g.es_multiple !== 'boolean' || typeof g.es_obligatorio !== 'boolean' || !Array.isArray(g.opciones)) throw new Error('La configuración de modificadores no es válida.')
    idsGrupos.add(g.id)
    for (const o of g.opciones) {
      if (!Number.isSafeInteger(o.id) || o.id <= 0 || idsOpciones.has(o.id) || o.grupo_id !== g.id ||
        typeof o.nombre_modificador !== 'string' || !o.nombre_modificador.trim() ||
        (o.es_exclusion !== undefined && typeof o.es_exclusion !== 'boolean')) throw new Error('La configuración de modificadores no es válida.')
      idsOpciones.add(o.id)
      aCentimos(o.precio_adicional)
    }
  }
}
