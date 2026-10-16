import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCompra,validarProveedor,validarAltaInsumo } from '../src/validators/compras.js';
const compra=()=>({proveedor_id:1,numero_factura:'f001-00001',fecha_emision:'2024-02-29',fecha_vencimiento:'2024-03-01',igv:'0.18',
  lineas:[{insumo_id:1,cantidad_base:'0.3333',costo_unitario:'0.15'},{insumo_id:2,cantidad_base:'2',costo_unitario:'0.50'}]});
test('importe por línea y total exactos, sin aceptar totales del cliente',()=>{
  const c=validarCompra(compra());assert.equal(c.numero_factura,'F001-00001');assert.equal(c.lineas[0].subtotal,'0.05');assert.equal(c.subtotal,'1.05');assert.equal(c.total,'1.23');
  assert.throws(()=>validarCompra({...compra(),total:'0'}));
});
test('fechas, duplicados, precisión y límites rechazan una captura parcial',()=>{
  for(const cambiar of [c=>c.fecha_emision='2025-02-29',c=>c.fecha_vencimiento='2024-02-01',c=>c.igv='0.001',
    c=>c.lineas.push({...c.lineas[0]}),c=>c.lineas[0].cantidad_base='0',c=>c.lineas[0].costo_unitario='1e2',
    c=>c.lineas[0].cantidad_base='0.00001',c=>c.lineas=[]]){const c=compra();cambiar(c);assert.throws(()=>validarCompra(c));}
  const c=compra();c.lineas[0]={insumo_id:1,cantidad_base:'99999999.9999',costo_unitario:'99999999.9999'};assert.throws(()=>validarCompra(c));
});
test('proveedor acotado y alta de insumo sin saldos, costos ni columnas libres',()=>{
  assert.equal(validarProveedor({razon_social:' Prueba ',ruc:'20123456789'}).razon_social,'Prueba');
  assert.throws(()=>validarProveedor({razon_social:'Prueba',ruc:'123',cuenta_bancaria:'no'}));
  const i={nombre:'Harina',codigo:'h-001',unidad:'kg',stock_minimo_alerta:'1'};
  assert.equal(validarAltaInsumo(i).stock_minimo_alerta,'1.0000');assert.throws(()=>validarAltaInsumo({...i,stock_fisico:'10'}));
});
