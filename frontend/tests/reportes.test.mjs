import test from 'node:test'
import assert from 'node:assert/strict'
import { reporteFixture } from './reportes-fixture.mjs'
import { filtroReporte, filtrosInicialesReporte, validarReporte, monedaReporte, serieCompletaReporte, csvReporte, celdaCsvReporte } from '../src/utils/reportes.js'
test('filtros del calendario real, Lima inicial y sesión estricta', () => {
  const inicial = filtrosInicialesReporte(new Date('2026-11-06T03:00:00Z')); assert.equal(inicial.hasta, '2026-11-05'); assert.equal(inicial.desde, '2026-10-30')
  for (const c of [{ desde: '2026-02-30' }, { hasta: '2027-12-31' }, { sesion_id: '1 OR 1=1' }, { sesion_id: '-2' }, { zona_horaria: 'otra' }]) assert.throws(() => filtroReporte({ ...inicial, ...c }))
  assert.equal(filtroReporte({ ...inicial, sesion_id: '42' }).sesion_id, '42')
})
test('validación del reporte conserva null/advertencias y rechaza datos corruptos', () => {
  const r = reporteFixture(); assert.equal(validarReporte(r), r)
  for (const alterar of [v => { v.ventas.total = 100 }, v => { v.medios.pop() }, v => { v.serie_ventas[0].fecha = '2026-11-10' }, v => { v.estimacion.resultado_tras_gastos = null }]) { const v = reporteFixture(); alterar(v); assert.throws(() => validarReporte(v)) }
  r.estimacion = { completa: false, advertencias: ['reservas_pendientes'], margen_base_menos_costo: null, resultado_tras_gastos: null }
  assert.equal(validarReporte(r).estimacion.resultado_tras_gastos, null)
})
test('importes grandes/negativos exactos y serie rellena días sin alterar el origen', () => {
  assert.equal(monedaReporte('9999999999999999.0001'), 'S/ 9,999,999,999,999,999.0001'); assert.equal(monedaReporte('-5.00'), '−S/ 5.00'); assert.equal(monedaReporte(null), 'No disponible')
  const r = reporteFixture(); const serie = serieCompletaReporte(r); assert.equal(serie.length, 6); assert.equal(serie[1].total, '0.00'); assert.equal(r.serie_ventas.length, 2)
})
test('CSV conserva filtros, importes y advertencias, neutraliza fórmulas y escapa comillas', () => {
  const r = reporteFixture(); const csv = csvReporte(r); assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"100.00"')); assert.ok(csv.includes('"America/Lima"')); assert.ok(csv.includes('"Plin";"0.00";"5.00";"\'-5.00"'))
  assert.equal(celdaCsvReporte('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"')
  r.estimacion = { completa: false, advertencias: ['reservas_pendientes'], margen_base_menos_costo: null, resultado_tras_gastos: null }; assert.ok(csvReporte(r).includes('No disponible')); assert.ok(csvReporte(r).includes('consumo pendiente'))
})
