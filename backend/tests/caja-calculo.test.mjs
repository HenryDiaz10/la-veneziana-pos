import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidarCaja, dineroConSigno, repartirEnteros, calcularLineasDevueltas, calcularPuntosDevueltos, revisionCaja } from '../src/services/caja-calculo.js';
import { validarAltaAutorizacion, idRecursoAutorizacion } from '../src/validators/autorizaciones.js';

test('efectivo aplicado, apertura y desembolsos por sesión; recibido no se suma dos veces', () => {
  const r = consolidarCaja({ apertura: '100.00', pagos: [{ metodo_pago: 'efectivo', monto_pagado: '60.00', monto_entregado: '100.00', vuelto: '40.00' }, { metodo_pago: 'yape', monto_pagado: '40.00' }],
    movimientos: [{ tipo: 'ingreso', monto: '20.00' }, { tipo: 'egreso', monto: '15.00' }], devoluciones: [{ metodo_pago: 'efectivo', monto: '6.00' }, { metodo_pago: 'yape', monto: '4.00' }] });
  assert.equal(r.teorico_efectivo, '159.00'); assert.equal(r.neto_por_metodo.yape, '36.00');
  assert.equal(dineroConSigno(15800n - 15900n), '-1.00');
  assert.equal(revisionCaja(r), revisionCaja(structuredClone(r)));
});
test('devolución de venta antigua concilia en la sesión del desembolso incluso con neto digital negativo', () => {
  const r = consolidarCaja({ apertura: '50', pagos: [], movimientos: [], devoluciones: [{ metodo_pago: 'yape', monto: '10.00' }] });
  assert.equal(r.teorico_efectivo, '50.00'); assert.equal(r.neto_por_metodo.yape, '-10.00');
});
test('parciales conservan todos los céntimos y rechazan cantidades acumuladas, duplicados y precios enviados', () => {
  const orig = [{ id: '9007199254740993', cantidad: 3, total: '1.00' }];
  const a = calcularLineasDevueltas(orig, [], [{ venta_detalle_id: orig[0].id, cantidad: 1 }]);
  assert.equal(a[0].importe, '0.33');
  const b = calcularLineasDevueltas(orig, a, [{ venta_detalle_id: orig[0].id, cantidad: 1 }]);
  const c = calcularLineasDevueltas(orig, [...a, ...b], [{ venta_detalle_id: orig[0].id, cantidad: 1 }]);
  assert.equal(b[0].importe, '0.34'); assert.equal(c[0].importe, '0.33');
  assert.throws(() => calcularLineasDevueltas(orig, [...a, ...b, ...c], [{ venta_detalle_id: orig[0].id, cantidad: 1 }]), { codigo: 'DEVOLUCION_EXCEDE_VENTA' });
  assert.throws(() => calcularLineasDevueltas(orig, [], [{ venta_detalle_id: orig[0].id, cantidad: 1, importe: '0.01' }]));
  assert.throws(() => calcularLineasDevueltas(orig, [], [{ venta_detalle_id: '1', cantidad: 1 }]), { codigo: 'DETALLE_NO_PERTENECE' });
  assert.throws(() => calcularLineasDevueltas(orig, [], [{ venta_detalle_id: orig[0].id, cantidad: 1 }, { venta_detalle_id: orig[0].id, cantidad: 1 }]));
});
test('reparto de cada parcial sobre medios restantes no supera capacidades ni convierte puntos en efectivo', () => {
  const capacidades = [1n, 2n, 7n];
  assert.deepEqual(repartirEnteros(5n, capacidades), [1n, 1n, 3n]);
  const restantes = capacidades.map((c, i) => c - repartirEnteros(5n, capacidades)[i]);
  assert.deepEqual(repartirEnteros(5n, restantes), restantes);
  assert.deepEqual(repartirEnteros(0n, [0n, 0n]), [0n, 0n]);
});
test('puntos por producto compensan la línea atribuible; por sol y canje no se duplican', () => {
  const originales = [{ id: '1', cantidad: 2, total: '20.00', snapshot_json: { puntos_recompensa: 10 } }, { id: '2', cantidad: 1, total: '10.00', snapshot_json: { puntos_recompensa: 0 } }];
  const venta = { total_final_venta: '30.00', snapshot_fiscal_json: { fidelizacion: { modo: 'por_producto', puntos_ganados: 20, puntos_canjeados: 0, valor_punto_pen: null } } };
  let l = calcularLineasDevueltas(originales, [], [{ venta_detalle_id: '2', cantidad: 1 }]);
  assert.equal(calcularPuntosDevueltos(venta, originales, [], l).revertidos, 0);
  l = calcularLineasDevueltas(originales, [], [{ venta_detalle_id: '1', cantidad: 1 }]);
  assert.equal(calcularPuntosDevueltos(venta, originales, [], l).revertidos, 10);
  venta.snapshot_fiscal_json.fidelizacion = { modo: 'por_sol', puntos_ganados: 24, puntos_canjeados: 60, valor_punto_pen: '0.10' };
  const p = calcularPuntosDevueltos(venta, originales, [], l);
  assert.deepEqual(p, { revertidos: 8, restaurados: 20, importeCanje: '2.00' });
});
test('autorizaciones conservan BIGINT exacto y rechazan números ya redondeados o campos elegidos por el cliente', () => {
  assert.ok(idRecursoAutorizacion('9223372036854775807'));
  assert.equal(idRecursoAutorizacion('9223372036854775808'), false);
  assert.equal(idRecursoAutorizacion(9007199254740992), false);
  const datos = { actorId: 1, accion: 'ventas/devolver', entidad: 'ventas_comprobantes', entidadId: '9007199254740993', motivo: 'Error de atención' };
  assert.equal(validarAltaAutorizacion(datos).entidadId, '9007199254740993');
  assert.equal(validarAltaAutorizacion({ ...datos, aprobadorId: 2 }), null);
});
