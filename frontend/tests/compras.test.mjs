import test from 'node:test'
import assert from 'node:assert/strict'
import { resumenCompra } from '../src/utils/compras.js'
test('vista previa redondea por línea y suma IGV como importe',()=>{
  const r=resumenCompra([{cantidad_base:'0.3333',costo_unitario:'0.15'},{cantidad_base:'2',costo_unitario:'0.50'}],'0.18')
  assert.deepEqual(r,{subtotal:'1.05',igv:'0.18',total:'1.23',subtotales:['0.05','1.00']})
})
test('vista previa rechaza cantidades nulas, precisión excesiva y desbordamiento',()=>{
  for(const fila of [{cantidad_base:'0',costo_unitario:'1'},{cantidad_base:'0.00001',costo_unitario:'1'},{cantidad_base:'99999999.9999',costo_unitario:'99999999.9999'}])assert.ok(resumenCompra([fila],'0').error)
  assert.ok(resumenCompra([{cantidad_base:'1',costo_unitario:'1'}],'0.001').error)
})
