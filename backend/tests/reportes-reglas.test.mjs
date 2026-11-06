import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrosReporte, validarGasto, decimalReporte, formatoReporte } from '../src/services/reportes-reglas.js';
test('día civil Lima y UTC, rango inclusivo y validación estricta sin campos SQL', () => {
  const f = filtrosReporte({ desde: '2026-11-05', hasta: '2026-11-05', sesion_id: '5' });
  assert.equal(f.inicio, '2026-11-05 05:00:00'); assert.equal(f.fin, '2026-11-06 05:00:00'); assert.equal(f.estado, 'emitida');
  assert.equal(filtrosReporte({ desde: '2026-11-05', hasta: '2026-11-05', zona_horaria: 'UTC' }).inicio, '2026-11-05 00:00:00');
  for (const cambio of [{ desde: '2026-02-30' }, { hasta: '2025-01-01' }, { hasta: '2028-01-01' }, { sesion_id: ['5'] }, { moneda: 'USD' }, { zona_horaria: 'Europe/Madrid' }, { estado: 'todo' }, { orden: 'DROP TABLE' }]) assert.throws(() => filtrosReporte({ desde: '2026-11-05', hasta: '2026-11-05', ...cambio }));
});
test('gastos positivos y clasificación: capital no se registra como gasto', () => {
  const g = { categoria_id: 1, descripcion: 'Interés del préstamo', clasificacion: 'financiero', monto_gasto: '10.30', fecha_gasto: '2026-11-05' };
  assert.equal(validarGasto(g).monto_gasto, '10.30');
  for (const cambio of [{ clasificacion: 'amortizacion_capital' }, { monto_gasto: '-1' }, { monto_gasto: '0' }, { monto_gasto: '1e2' }, { usuario_registro_id: 7 }, { movimiento_caja_id: '2' }]) assert.throws(() => validarGasto({ ...g, ...cambio }));
  assert.throws(() => filtrosReporte({ desde: '2026-11-05', hasta: '2026-11-05', limite: ['50'] }, true));
});
test('agregados grandes, signos y cuatro decimales sin Number ni pérdida de centavos', () => {
  assert.equal(formatoReporte(decimalReporte('99999999999999.99') + decimalReporte('0.01')), '100000000000000.00');
  assert.equal(formatoReporte(decimalReporte('-0.0001', 4), 4), '-0.0001');
  assert.equal(formatoReporte(decimalReporte('90.00') * 100n - decimalReporte('10.1234', 4), 4), '79.8766');
  assert.throws(() => decimalReporte('1.001')); assert.throws(() => decimalReporte('NaN'));
});
