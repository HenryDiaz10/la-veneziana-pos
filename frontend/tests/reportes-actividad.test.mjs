import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reporteFixture,actividadFixture} from './reportes-fixture.mjs'
import {serieActividad,validarReporte,csvAnalitica,filtrosInicialesReporte} from '../src/utils/reportes.js'
import {csvResultados,nivelesResultado} from '../src/utils/resultados.js'
import {resumenComprasGastos} from '../src/utils/compras-gastos.js'
test('actividad conserva compra sin ventas, fechas, exactitud y CSV de ambas pantallas',()=>{
  const r=reporteFixture(),niveles=nivelesResultado(r)
  r.compras={cantidad:1,total:'118.00',saldadas:'118.00',pendientes_sin_abonos:'0.00',parciales:0,total_documentos_parciales:'0.00',saldo_pendiente:'0.00'}
  r.actividad_financiera=actividadFixture()
  validarReporte(r);const serie=serieActividad(r)
  assert.equal(serie.find(d=>d.fecha==='2026-11-02').compras,'118.00');assert.equal(serie.find(d=>d.fecha==='2026-11-02').ventas,'0.00');assert.deepEqual(nivelesResultado(r),niveles)
  assert.ok(csvAnalitica(r).includes('118.00'));assert.ok(csvResultados(r).includes('TEST-COMPRA'));assert.ok(csvResultados(r).includes('Compras confirmadas con IGV'))
  r.actividad_financiera.compras_por_dia[0].fecha='2026-10-31';assert.throws(()=>validarReporte(r))
  assert.equal(filtrosInicialesReporte(new Date('2026-11-13T18:00:00Z')).desde,'2026-11-01')
})
test('compras incluidas en total administrativo sin volver a descontarlas de utilidad',()=>{
  const r=reporteFixture(),antes=nivelesResultado(r)
  r.compras={cantidad:6,total:'9954.90',saldadas:'9954.90',pendientes_sin_abonos:'0.00',parciales:0,total_documentos_parciales:'0.00',saldo_pendiente:'0.00'}
  r.actividad_financiera=actividadFixture();r.gastos.total='37.90'
  assert.deepEqual(resumenComprasGastos(r),{compras:'9954.90',otros:'37.90',total:'9992.80'})
  assert.deepEqual(nivelesResultado(r),antes)
  assert.ok(csvAnalitica(r).includes('"Total compras y otros gastos registrados";"9992.80"'))
  assert.ok(csvResultados(r).includes('9992.80'))
  r.compras.saldadas='0.00';assert.equal(resumenComprasGastos(r).total,'9992.80','Registro no se confunde con pago bancario')
  r.compras.total='90071992547409.93';r.gastos.total='0.07';assert.equal(resumenComprasGastos(r).total,'90071992547410.00')
  r.compras.total='-1.00';assert.throws(()=>resumenComprasGastos(r))
})
