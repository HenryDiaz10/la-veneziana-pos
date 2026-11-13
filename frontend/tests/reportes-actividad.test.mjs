import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reporteFixture,actividadFixture} from './reportes-fixture.mjs'
import {serieActividad,validarReporte,csvAnalitica,filtrosInicialesReporte} from '../src/utils/reportes.js'
import {csvResultados,nivelesResultado} from '../src/utils/resultados.js'
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
