export const MEDIOS_REPORTE = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta_debito: 'Tarjeta de débito', tarjeta_credito: 'Tarjeta de crédito', transferencia: 'Transferencia', puntos_vip: 'Puntos VIP', cortesia: 'Cortesía' }
export const COLORES_REPORTE = Object.freeze(['#F59E0B', '#EF4444', '#84CC16'])
export const CLASES_REPORTE = { operativo: 'Operativos', financiero: 'Financieros', extraordinario: 'Extraordinarios', provision_impuesto: 'Provisión de impuesto' }
export const AVISOS_REPORTE = { reservas_pendientes: 'Hay preparaciones con consumo pendiente.', consumos_sin_costo: 'Existen consumos sin costo histórico completo.', lineas_sin_tarea: 'Hay líneas sin tarea de preparación.', tareas_sin_reserva: 'Hay tareas sin reservas de insumos.', tareas_canceladas: 'La selección incluye tareas canceladas.', ventas_sin_lineas: 'Hay ventas sin líneas registradas.', devoluciones_sin_desglose_impuesto: 'Existen devoluciones sin desglose de base e impuesto.', seleccion_incluye_estados_no_emitidos: 'Se seleccionaron estados distintos de emitida.', gastos_globales_no_asignados_a_sesion: 'Hay gastos globales sin asignación a una sesión.', pagos_no_concilian_con_ventas: 'Los pagos no concilian con las cabeceras de venta.' }
const exigir = c => { if (!c) throw new Error('La respuesta gerencial necesita revisión. Vuelve a consultar.') }
const fecha = v => typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v
const dinero = (v, dec = 2) => typeof v === 'string' && new RegExp(`^-?\\d{1,60}\\.\\d{${dec}}$`).test(v)
export function filtroReporte(datos) {
  if (!fecha(datos.desde) || !fecha(datos.hasta) || datos.desde > datos.hasta || (Date.parse(datos.hasta) - Date.parse(datos.desde)) / 86400000 >= 366) throw new Error('Selecciona fechas válidas y un periodo de hasta 366 días.')
  if (!['emitida', 'anulada', 'rechazada_sunat', 'todos'].includes(datos.estado) || !['America/Lima', 'UTC'].includes(datos.zona_horaria)) throw new Error('Revisa estado y zona horaria.')
  const sesion = String(datos.sesion_id ?? '').trim()
  if (sesion && (!/^[1-9]\d{0,9}$/.test(sesion) || BigInt(sesion) > 2147483647n)) throw new Error('La sesión debe ser un ID entero positivo.')
  return { desde: datos.desde, hasta: datos.hasta, estado: datos.estado, zona_horaria: datos.zona_horaria, moneda: 'PEN', ...(sesion ? { sesion_id: sesion } : {}) }
}
export function filtrosInicialesReporte(ahora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora).map(p => [p.type, p.value]))
  const hasta = `${partes.year}-${partes.month}-${partes.day}`
  return filtroReporte({ desde: new Date(Date.parse(hasta + 'T00:00:00Z') - 6 * 86400000).toISOString().slice(0, 10), hasta, estado: 'emitida', zona_horaria: 'America/Lima' })
}
export function validarReporte(r) {
  exigir(r?.version_algoritmo === 1 && Number.isFinite(Date.parse(r.consultado_en)))
  filtroReporte(r.filtros)
  exigir(r.filtros.moneda === 'PEN' && Number.isSafeInteger(r.ventas?.cantidad) && r.ventas.cantidad >= 0)
  for (const k of ['total', 'base_registrada', 'impuesto_registrado', 'ticket_promedio']) exigir(dinero(r.ventas[k]) && !r.ventas[k].startsWith('-'))
  exigir(Array.isArray(r.medios) && r.medios.length === Object.keys(MEDIOS_REPORTE).length && new Set(r.medios.map(m => m.metodo)).size === r.medios.length)
  for (const m of r.medios) exigir(Object.hasOwn(MEDIOS_REPORTE, m.metodo) && dinero(m.cobrado) && dinero(m.devuelto) && dinero(m.neto) && !m.cobrado.startsWith('-') && !m.devuelto.startsWith('-'))
  exigir(Array.isArray(r.serie_ventas) && r.serie_ventas.length <= 366)
  const dias = new Set()
  for (const d of r.serie_ventas) { exigir(fecha(d.fecha) && d.fecha >= r.filtros.desde && d.fecha <= r.filtros.hasta && !dias.has(d.fecha) && Number.isSafeInteger(d.cantidad) && d.cantidad >= 0 && dinero(d.total) && !d.total.startsWith('-')); dias.add(d.fecha) }
  for (const k of Object.keys(CLASES_REPORTE)) exigir(dinero(r.gastos?.por_clase?.[k]) && !r.gastos.por_clase[k].startsWith('-'))
  for (const v of [r.gastos.total, r.gastos.sin_asignacion_sesion_en_periodo, r.movimientos?.ingresos, r.movimientos?.egresos, r.movimientos?.egresos_sin_gasto, r.devoluciones_periodo, r.neto_comercial_periodo_incluye_impuesto]) exigir(dinero(v))
  exigir(dinero(r.costos?.cohorte_ventas, 4) && Array.isArray(r.estimacion?.advertencias) && r.estimacion.advertencias.every(x => typeof x === 'string') && typeof r.estimacion.completa === 'boolean')
  exigir(Array.isArray(r.costos.salidas_periodo) && r.costos.salidas_periodo.every(s => ['SALIDA_VENTA', 'SALIDA_MERMA', 'SALIDA_AJUSTE'].includes(s.tipo) && dinero(s.costo, 4) && Number.isSafeInteger(s.sin_costo) && s.sin_costo >= 0))
  exigir(r.politica && typeof r.politica === 'object' && Object.values(r.politica).every(v => typeof v === 'string'))
  for (const k of ['margen_base_menos_costo', 'resultado_tras_gastos']) exigir(r.estimacion.completa ? dinero(r.estimacion[k], 4) : r.estimacion[k] === null)
  exigir(!r.estimacion.completa || r.estimacion.advertencias.length === 0)
  return r
}
// Texto exacto sin pasar importes por Number. Number se usa solo para dibujar.
export function monedaReporte(valor) {
  if (valor === null) return 'No disponible'
  const negativo = valor.startsWith('-'), [a, b] = (negativo ? valor.slice(1) : valor).split('.')
  return `${negativo ? '−' : ''}S/ ${a.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${b}`
}
export function serieCompletaReporte(r) {
  const mapa = new Map(r.serie_ventas.map(d => [d.fecha, d]))
  const filas = []
  for (let ms = Date.parse(r.filtros.desde + 'T00:00:00Z'), fin = Date.parse(r.filtros.hasta + 'T00:00:00Z'); ms <= fin; ms += 86400000) {
    const dia = new Date(ms).toISOString().slice(0, 10); filas.push(mapa.get(dia) ?? { fecha: dia, cantidad: 0, total: '0.00' })
  }
  return filas
}
// Todas las celdas son texto; neutralizar fórmulas al abrir con una hoja de cálculo.
export function celdaCsvReporte(v) { const s = String(v ?? ''); return '"' + (/^[\s]*[=+\-@]/u.test(s) ? "'" + s : s).replaceAll('"', '""') + '"' }
export function csvReporte(r) {
  const filas = [['LA VENEZIANA', 'Reporte gerencial'], ['Consultado', r.consultado_en], ...Object.entries(r.filtros).filter(([k]) => ['desde', 'hasta', 'estado', 'sesion_id', 'moneda', 'zona_horaria'].includes(k)),
    ['Estimación completa', r.estimacion.completa ? 'Sí' : 'No'], ...r.estimacion.advertencias.map(a => ['Advertencia', AVISOS_REPORTE[a] ?? 'Advertencia no reconocida: ' + a]),
    ['Indicador', 'Importe'], ...Object.entries(r.ventas), ['Devoluciones del periodo', r.devoluciones_periodo], ['Neto comercial con impuesto', r.neto_comercial_periodo_incluye_impuesto], ['Costo cohorte', r.costos.cohorte_ventas], ['Resultado referencial', r.estimacion.resultado_tras_gastos ?? 'No disponible'],
    ['Medio', 'Cobrado', 'Devuelto', 'Neto'], ...r.medios.map(m => [MEDIOS_REPORTE[m.metodo], m.cobrado, m.devuelto, m.neto]),
    ['Gastos', 'Importe'], ...Object.entries(r.gastos.por_clase).map(([k, v]) => [CLASES_REPORTE[k], v]), ['Fecha', 'Ventas', 'Total'], ...serieCompletaReporte(r).map(d => [d.fecha, d.cantidad, d.total])]
  return '\uFEFF' + filas.map(f => f.map(celdaCsvReporte).join(';')).join('\r\n')
}
