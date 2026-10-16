import test from 'node:test';
import assert from 'node:assert/strict';
import { decimalInventario as d, formatoInventario as f, promedioIngreso, costoTotalConsumo,
  comprobarSaldos, ingredientesTarea, idTareaInventario, ErrorInventario, MAX_SALDO } from '../src/services/inventario-calculo.js';

test('decimales exactos y límites de cantidad, sin truncar capturas', () => {
  assert.equal(f(d('99999999.9999')), '99999999.9999');
  assert.equal(d('0.1001') + d('0.2002'), d('0.3003'));
  for (const valor of ['-1', '1e2', '1,2', '0.00001', '100000000', null, Infinity])
    assert.throws(() => d(valor), ErrorInventario);
  assert.throws(() => d('0', { positivo: true }), ErrorInventario);
  assert.equal(idTareaInventario('9223372036854775807'), '9223372036854775807');
  assert.throws(() => idTareaInventario(9007199254740992), ErrorInventario);
});
test('promedio ponderado móvil y mitad alejándose de cero', () => {
  assert.equal(f(promedioIngreso(d('2'), d('10'), d('1'), d('16'))), '12.0000');
  assert.equal(f(promedioIngreso(0n, d('999'), d('1'), d('7.25'))), '7.2500');
  assert.equal(f(promedioIngreso(d('1'), d('0'), d('1'), d('0.0001'))), '0.0001');
  assert.throws(() => promedioIngreso(MAX_SALDO, 0n, 1n, 0n), ErrorInventario);
});
test('costo congelado total y saldos reservados nunca exceden físico', () => {
  assert.equal(f(costoTotalConsumo(d('0.2500'), d('12.3456'))), '3.0864');
  assert.throws(() => costoTotalConsumo(MAX_SALDO, MAX_SALDO), ErrorInventario);
  comprobarSaldos(d('1'), d('1'));
  assert.throws(() => comprobarSaldos(d('1'), d('1.0001')), ErrorInventario);
  assert.throws(() => comprobarSaldos(-1n, 0n), ErrorInventario);
});
test('snapshot total se usa una sola vez; rechazo de identidad, unidad o duplicados inválidos', () => {
  const tarea = { producto_id: 1, variante_id: null, cantidad: 2, snapshot_json: { version: 1,
    producto_venta_id: 1, variante_id: null, cantidad: 2, ingredientes: [{ insumo_id: 1,
      unidad_medida_id: 1, unidad: 'kg', cantidad_bruta_unitaria: '0.2500', cantidad_bruta_total: '0.5000' }] } };
  assert.equal(ingredientesTarea(tarea)[0].cantidad, d('0.5000'));
  for (const cambiar of [s => s.producto_venta_id = 2, s => s.cantidad = 3,
    s => s.ingredientes[0].cantidad_bruta_total = '1', s => s.ingredientes[0].unidad = 'g',
    s => s.ingredientes.push({ ...s.ingredientes[0] }), s => s.ingredientes = []]) {
    const copia = structuredClone(tarea); cambiar(copia.snapshot_json);
    assert.throws(() => ingredientesTarea(copia), ErrorInventario);
  }
});
