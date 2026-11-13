import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validarAnaliticaClientes} from '../src/utils/clientes-analitica.js'
import {csvClientes} from '../src/utils/reportes.js'
import {clientesFixture,reporteFixture} from './reportes-fixture.mjs'
test('Analítica válida y CSV con importes exactos, alcance y rankings acotados',()=>{
  const r=reporteFixture();assert.equal(validarAnaliticaClientes(r.clientes),r.clientes)
  const csv=csvClientes(r);assert.ok(csv.includes('Mis clientes'));assert.ok(csv.includes('"35.00"'));assert.ok(csv.includes('máximo 20'))
  r.clientes.ranking_ingresos[0].nombre='=HYPERLINK("peligro")'
  assert.ok(csvClientes(r).includes("'=HYPERLINK"))
})
test('Rechaza identidades duplicadas, dinero inválido y segmentos incoherentes',()=>{
  for(const cambiar of [c=>c.resumen.nuevos++,c=>c.resumen.recompra_porcentaje='101.00',c=>c.ranking_ingresos.push(c.ranking_ingresos[0]),c=>c.ranking_frecuencia[0].neto='NaN',c=>c.ranking_unidades[0].unidades='1.5']){
    const c=clientesFixture();cambiar(c);assert.throws(()=>validarAnaliticaClientes(c))
  }
})
