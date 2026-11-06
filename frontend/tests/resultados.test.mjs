import test from 'node:test'
import assert from 'node:assert/strict'
import {nivelesResultado,csvResultados} from '../src/utils/resultados.js'
import {validarReporte,csvAnalitica,filtroReporte} from '../src/utils/reportes.js'
import {reporteFixture,analiticaFixture} from './reportes-fixture.mjs'
test('cuatro niveles exactos, provisión solo en el cuarto y compras no duplicadas',()=>{
  const r=reporteFixture();r.compras={total:'9954.90'}
  assert.deepEqual(nivelesResultado(r),{bruta:'80.0000',operativa:'78.0000',antes_impuestos:'71.0000',neta:'66.0000'})
  r.gastos.por_clase.provision_impuesto='0.00';assert.equal(nivelesResultado(r).neta,null)
  r.estimacion.completa=false;assert.equal(nivelesResultado(r).bruta,null)
  assert.ok(csvResultados(r).includes('No disponible'))
})
test('analítica validada, filtros por canal/mesero y CSV separado de finanzas',()=>{
  const r=reporteFixture();r.analitica=analiticaFixture();assert.equal(validarReporte(r),r)
  assert.ok(csvAnalitica(r).includes('Mesera de prueba'));assert.ok(!csvAnalitica(r).includes('Resultado referencial'))
  assert.equal(filtroReporte({...r.filtros,canal:'salon',mesero_id:'20'}).canal,'salon')
  for(const f of [{canal:'otro'},{mesero_id:'-1'},{mesero_id:'1 OR 1=1'}])assert.throws(()=>filtroReporte({...r.filtros,...f}))
  r.analitica.horas.pop();assert.throws(()=>validarReporte(r))
})
