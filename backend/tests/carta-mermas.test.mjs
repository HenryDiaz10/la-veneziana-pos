import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarMermaIngrediente, mermaPorInsumo } from '../data/carta-mermas.mjs';
import { calcularIngrediente } from '../../frontend/src/utils/recetas.js';
test('la merma conserva el objetivo neto y coincide con el editor web', () => {
  for (const [insumo, cantidad, unidad] of [['mozzarella', '0.2000', 'kg'], ['salsa_tomate', '0.0450', 'kg'], ['pina', '0.0600', 'kg'], ['leche', '0.1500', 'l'], ['huevo', '1.0000', 'un']]) {
    const r = aplicarMermaIngrediente({ insumo, cantidad });
    const calculo = calcularIngrediente({ insumo: { activo: true, unidad: { abreviatura: unidad } }, cantidad, unidad, tipo: 'neta', merma: r.merma });
    assert.deepEqual(calculo.errores, {});
    assert.equal(r.cantidad, calculo.bruto);
    assert.equal(r.cantidad_neta_referencia, cantidad);
  }
  assert.equal(aplicarMermaIngrediente({ insumo: 'mozzarella', cantidad: '0.2000' }).cantidad, '0.2041');
});
test('líquidos, frutas limpias y unidades usan pérdidas diferenciadas', () => {
  for (const [k, p] of [['harina', '2.00'], ['res', '3.00'], ['pina', '5.00'], ['limon', '1.00'], ['corona', '0.00'], ['huevo', '0.00'], ['agua', '0.00']]) assert.equal(mermaPorInsumo(k), p);
  assert.throws(() => mermaPorInsumo('desconocido'));
});
