import test from 'node:test';
import assert from 'node:assert/strict';
import { convertirCantidadBase, congelarSnapshotReceta, formatearCantidad, cantidadEscalada } from '../src/services/recetas-calculo.js';
import { validarVinculoReceta, validarRecetaCompleta, validarDeltaReceta, validarResolucionReceta, normalizarMerma } from '../src/validators/recetas.js';

test('convierte masa, volumen y unidades con cuatro decimales exactos', () => {
  for (const [cantidad, origen, base, esperado] of [
    ['200', 'g', 'kg', '0.2000'], ['125', 'ml', 'l', '0.1250'], ['1.25', 'L', 'l', '1.2500'],
    ['3', 'un', 'un', '3.0000'], ['0.05', 'g', 'kg', '0.0001'], ['99999999.99994', 'kg', 'kg', '99999999.9999']
  ]) assert.equal(convertirCantidadBase(cantidad, origen, base).cantidad, esperado);
  assert.equal(convertirCantidadBase('-0.05', 'g', 'kg', { negativo: true }).cantidad, '-0.0001');
  assert.equal(formatearCantidad(cantidadEscalada('-0.1000')), '-0.1000');
});

test('rechaza unidades incompatibles, cero, desbordamiento y pérdida a cero', () => {
  assert.equal(convertirCantidadBase('200', 'ml', 'kg').error, 'unidad_incompatible');
  assert.equal(convertirCantidadBase('1', 'un', 'kg').error, 'unidad_incompatible');
  for (const cantidad of ['0', '0.049', '999999999999']) assert.ok(convertirCantidadBase(cantidad, 'g', 'kg').error);
  assert.ok(convertirCantidadBase('99999999.99995', 'kg', 'kg').error);
  for (const cantidad of ['1e3', 'NaN', Infinity, true, '-2', '1,2', null]) assert.ok(convertirCantidadBase(cantidad, 'kg', 'kg').error);
});

test('la merma es metadato porcentual, entre 0 y 99.99, sin redondeo implícito', () => {
  assert.equal(normalizarMerma('0'), '0.00');
  assert.equal(normalizarMerma('12.5'), '12.50');
  assert.equal(normalizarMerma('99.99'), '99.99');
  for (const merma of ['100', '-1', '0.001', null, true]) assert.equal(normalizarMerma(merma), null);
});

test('valida campos permitidos, variantes, recetas completas y límites', () => {
  const ingrediente = { insumo_id: 1, cantidad_bruta_necesaria: '200', unidad: 'g' };
  assert.ok(validarVinculoReceta({ producto_venta_id: 1, ...ingrediente }));
  assert.equal(validarVinculoReceta({ producto_venta_id: 1, ...ingrediente, variante_clave: 0 }), null);
  assert.equal(validarVinculoReceta({ producto_venta_id: 1, ...ingrediente, variante_id: 0 }), null);
  assert.ok(validarRecetaCompleta({ ingredientes: [ingrediente] }));
  assert.equal(validarRecetaCompleta({ ingredientes: [ingrediente, ingrediente] }), null);
  assert.equal(validarRecetaCompleta({ ingredientes: [] }), null);
  assert.equal(validarRecetaCompleta({ ingredientes: Array(101).fill(ingrediente) }), null);
});

test('no permite deltas o modificadores arbitrarios al resolver', () => {
  assert.ok(validarDeltaReceta({ modificador_id: 1, insumo_id: 1, delta_cantidad_base: '-0.1' }));
  assert.equal(validarDeltaReceta({ modificador_id: 1, insumo_id: 1, delta_cantidad_base: '0' }), null);
  assert.ok(validarResolucionReceta({ producto_venta_id: 1, cantidad: 2, modificadores: [1, 2] }));
  for (const extra of [{ cantidad: 0 }, { cantidad: 1.5 }, { cantidad: 10001 }, { modificadores: [1, 1] }, { deltas: [] }]) {
    assert.equal(validarResolucionReceta({ producto_venta_id: 1, ...extra }), null);
  }
});

test('el snapshot es independiente e inmutable en todos sus niveles', () => {
  const entrada = { ingredientes: [{ cantidad_bruta_total: '0.2000' }] };
  const snapshot = congelarSnapshotReceta(entrada);
  entrada.ingredientes[0].cantidad_bruta_total = '9.0000';
  assert.equal(snapshot.ingredientes[0].cantidad_bruta_total, '0.2000');
  assert.throws(() => { snapshot.ingredientes[0].cantidad_bruta_total = '8.0000'; }, TypeError);
});
