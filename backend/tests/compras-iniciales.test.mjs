import test from 'node:test';
import assert from 'node:assert/strict';
import {lineasComprasIniciales} from '../data/compras-iniciales.mjs';
import {construirDocumentosIniciales,uidCompraInicial} from '../src/services/compras-iniciales.service.js';
import {proveedoresReferencia} from '../data/proveedores-referencia.mjs';
import {sequelize} from '../src/config/database.js';
const insumos=lineasComprasIniciales.map((l,n)=>({id:n+1,codigo:l.codigo,unidad:l.unidad}));
const proveedores=proveedoresReferencia.map((p,n)=>({...p,id:n+1,estado:'activo'}));
test('abastecimiento completo, costos netos, documentos internos y 18% exacto por documento',()=>{
  const documentos=construirDocumentosIniciales(insumos,proveedores);
  assert.equal(lineasComprasIniciales.length,125);
  assert.equal(new Set(lineasComprasIniciales.map(l=>l.codigo)).size,125);
  assert.equal(documentos.length,6);
  assert.equal(documentos.reduce((n,d)=>n+d.datos.lineas.length,0),125);
  let total=0n;
  for(const d of documentos){
    assert.match(d.datos.numero_factura,/^CI-20261106-00[1-6]$/);
    assert.equal(d.datos.fecha_emision,'2026-11-06');
    assert.match(d.datos.operacion_uid,/^compra:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
    const centimos=BigInt(d.calculada.subtotal.replace('.',''));
    assert.equal(BigInt(d.calculada.igv.replace('.','')),(centimos*18n+50n)/100n);
    total+=BigInt(d.calculada.total.replace('.',''));
    for(const l of d.datos.lineas){assert.ok(Number(l.cantidad_base)>0);assert.ok(Number(l.costo_unitario)>0);}
  }
  assert.equal(total,995490n);
  assert.equal(uidCompraInicial('20100055237'),uidCompraInicial('20100055237'));
});
test('rechaza cobertura incompleta, unidades equivocadas o proveedor inactivo',()=>{
  assert.throws(()=>construirDocumentosIniciales(insumos.slice(1),proveedores),/cobertura/);
  assert.throws(()=>construirDocumentosIniciales(insumos.map((i,n)=>n?i:{...i,unidad:'un'}),proveedores),/Unidad/);
  assert.throws(()=>construirDocumentosIniciales(insumos,proveedores.map(p=>({...p,estado:'inactivo'}))),/Proveedor/);
});
test.after(async()=>{await sequelize.close();});
