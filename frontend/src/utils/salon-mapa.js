// Los códigos se conservan exactamente como aparecen en el SQL.
export const ESTADOS_MESA = Object.freeze({ libre: 'Libre', ocupada: 'Ocupada', sucia_por_limpiar: 'Por limpiar', inhabilitada: 'Inhabilitada' })
export const etiquetaEstado = estado => ESTADOS_MESA[estado] ?? 'Sin estado registrado'
const idValido = n => Number.isInteger(n) && n > 0 && n <= 2147483647

// Fallar completo ante datos incoherentes evita mostrar un mapa parcial engañoso.
export function validarSalon(datos) {
  if (!datos || !Array.isArray(datos.zonas) || !Array.isArray(datos.mesas) || typeof datos.consultado_en !== 'string' || !Number.isFinite(Date.parse(datos.consultado_en))) throw new Error('Mapa de salón no válido.')
  const zonas = new Set(), mesas = new Set(), codigos = new Set()
  for (const z of datos.zonas) {
    if (!idValido(z.id) || zonas.has(z.id) || typeof z.nombre !== 'string' || !z.nombre.trim() || z.nombre.length > 50 || (z.aforo_maximo !== null && !Number.isInteger(z.aforo_maximo))) throw new Error('Zona no válida.')
    zonas.add(z.id)
  }
  for (const m of datos.mesas) {
    if (!idValido(m.id) || mesas.has(m.id) || !zonas.has(m.zona_id) || typeof m.codigo_mesa !== 'string' || !m.codigo_mesa.trim() || m.codigo_mesa.length > 10 || codigos.has(m.codigo_mesa) ||
      (m.estado_actual !== null && !Object.hasOwn(ESTADOS_MESA, m.estado_actual)) ||
      (m.capacidad_sillas !== null && !Number.isInteger(m.capacidad_sillas)) ||
      (m.mesero_asignado_id !== null && !idValido(m.mesero_asignado_id)) ||
      ![m.posicion_x, m.posicion_y].every(n => n === null || Number.isInteger(n))) throw new Error('Mesa no válida.')
    mesas.add(m.id); codigos.add(m.codigo_mesa)
  }
  return datos
}

const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
export function filtrarMesas(mesas, { zonaId, estado = '', busqueda = '', soloMias = false, usuarioId } = {}) {
  const consulta = normalizar(busqueda)
  return mesas.filter(m => (zonaId === undefined || m.zona_id === zonaId) && (!estado || m.estado_actual === estado) &&
    (!soloMias || m.mesero_asignado_id === usuarioId) && (!consulta || normalizar(m.codigo_mesa).includes(consulta)))
}
export function contarMesas(mesas) {
  const conteo = { total: mesas.length, libre: 0, ocupada: 0, sucia_por_limpiar: 0, inhabilitada: 0, sin_estado: 0 }
  for (const m of mesas) conteo[Object.hasOwn(ESTADOS_MESA, m.estado_actual) ? m.estado_actual : 'sin_estado']++
  return conteo
}

// Normalizar coordenadas a la superficie visible sin persistir ni inventar posiciones.
// Si un par de botones quedaría superpuesto, toda la zona usa cuadrícula accesible.
export function distribuirMesas(mesas, ancho = 800) {
  if (!mesas.length) return { modo: 'vacio', posiciones: [] }
  if (!Number.isFinite(ancho) || ancho < 500 || mesas.some(m => m.posicion_x === null || m.posicion_y === null)) return { modo: 'cuadricula', posiciones: [] }
  const xs = mesas.map(m => m.posicion_x), ys = mesas.map(m => m.posicion_y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const alto = 480, margenX = 80, margenY = 68
  const posiciones = mesas.map(m => ({ id: m.id, x: maxX === minX ? ancho / 2 : margenX + (m.posicion_x - minX) / (maxX - minX) * (ancho - 2 * margenX),
    y: maxY === minY ? alto / 2 : margenY + (m.posicion_y - minY) / (maxY - minY) * (alto - 2 * margenY) }))
  const colision = posiciones.some((a, i) => posiciones.slice(i + 1).some(b => Math.abs(a.x - b.x) < 150 && Math.abs(a.y - b.y) < 125))
  return colision ? { modo: 'cuadricula', posiciones: [] } : { modo: 'mapa', posiciones, alto }
}
