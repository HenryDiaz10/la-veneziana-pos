import test from 'node:test';
import assert from 'node:assert/strict';
import { validarLineas, centimos, dinero, politicaFinanciera, desglosarImpuesto, validarPagos, idGrande } from '../src/services/pedidos-calculo.js';
const politica = politicaFinanciera({ igv_porcentaje: '18.00', precios_incluyen_impuesto: true, valor_punto_pen: '0.10' });
test('comandos de líneas solo aceptan selecciones y notas acotadas, con IDs grandes exactos', () => {
  const l = { productoId: 1, cantidad: 2, modificadoresIds: [3], indicaciones: ' Sin cebolla\n poco ají ' };
  assert.equal(validarLineas([l])[0].indicaciones, 'Sin cebolla poco ají');
  for (const extra of [{precio: '1.00'}, {cantidad: 0}, {cantidad: 1.5}, {modificadoresIds:[3,3]}, {indicaciones:'x'.repeat(251)}]) assert.throws(() => validarLineas([{...l,...extra}]));
  assert.equal(idGrande('9007199254740993'), '9007199254740993');
  assert.throws(() => idGrande(9007199254740992));
});
test('dinero y desglose cuadran por línea sin tasa predeterminada', () => {
  assert.deepEqual(desglosarImpuesto(1000n, politica.tasa), {base:'8.47', impuesto:'1.53', total:'10.00'});
  assert.equal(centimos('9999999999.99'),999999999999n);
  assert.throws(() => dinero(1000000000000n));
  for (const config of [null, {}, {igv_porcentaje:null}, {igv_porcentaje:'101',precios_incluyen_impuesto:true}]) assert.throws(() => politicaFinanciera(config));
});
test('pagos mixtos distinguen efectivo aplicado, entregado y vuelto, sin sobrantes', () => {
  const r=validarPagos([{metodo_pago:'yape',monto_pagado:'4.00',referencia_operacion:'REF-1',verificado:true},
    {metodo_pago:'efectivo',monto_pagado:'6.00',monto_entregado:'10.00'}],1000n,politica);
  assert.equal(r.filas[1].vuelto,'4.00');
  for(const pagos of [[{metodo_pago:'efectivo',monto_pagado:'11',monto_entregado:'11'}],
    [{metodo_pago:'yape',monto_pagado:'10',referencia_operacion:'R-1'}],
    [{metodo_pago:'efectivo',monto_pagado:'10',monto_entregado:'9'}],
    [{metodo_pago:'cortesia',monto_pagado:'10'}]]) assert.throws(()=>validarPagos(pagos,1000n,politica));
});
test('el canje exige equivalencia configurada; no inventa el valor de un punto',()=>{
  const pagos=[{metodo_pago:'puntos_vip',monto_pagado:'2.00',puntos:20},{metodo_pago:'efectivo',monto_pagado:'8',monto_entregado:'8'}];
  assert.equal(validarPagos(pagos,1000n,politica).canje,20);
  assert.throws(()=>validarPagos(pagos,1000n,{...politica,valorPunto:null}));
  assert.throws(()=>validarPagos([{...pagos[0],puntos:19},pagos[1]],1000n,politica));
});
