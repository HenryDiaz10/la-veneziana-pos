import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluarPagosMixtos, prepararComandoPago } from '../src/utils/pagos-mixtos.js'
import { validarPagos, politicaFinanciera } from '../../backend/src/services/pedidos-calculo.js'
const efectivo = { metodo: 'efectivo', aplicado: '60', entregado: '100' }
const yape = { metodo: 'yape', aplicado: '40', referencia: 'OP-123456', verificado: true }
test('Yape 40 + efectivo 60 cubren 100; recibido 100 devuelve 40, sin sumar el billete al ingreso', () => {
  const r = evaluarPagosMixtos('100.00', [yape, efectivo])
  assert.ok(r.valido); assert.equal(r.aplicado, '100.00'); assert.equal(r.vuelto, '40.00')
  assert.equal(r.faltante, '0.00'); assert.equal(r.exceso, '0.00')
  const politica = politicaFinanciera({ igv_porcentaje: '18', precios_incluyen_impuesto: true })
  assert.equal(validarPagos(r.pagos, 10000n, politica).filas[1].vuelto, '40.00')
})
test('bloquear faltantes, sobrantes, recibido insuficiente y referencias sin verificación', () => {
  for (const filas of [[{ ...efectivo, aplicado: '50' }, yape], [{ ...efectivo, aplicado: '70' }, yape],
    [{ ...efectivo, entregado: '59' }, yape], [efectivo, { ...yape, verificado: false }],
    [efectivo, { ...yape, referencia: 'x' }], [efectivo, { ...yape, referencia: 'REF\nINJECT' }]]) assert.equal(evaluarPagosMixtos('100.00', filas).valido, false)
  assert.throws(() => evaluarPagosMixtos('100', [efectivo, efectivo]))
})
test('captura decimal exacta, coma, cero, exponentes y límite de importes', () => {
  assert.equal(evaluarPagosMixtos('0.30', [{ ...efectivo, aplicado: '0,10', entregado: '0,10' }, { ...yape, aplicado: '0.20' }]).valido, true)
  for (const aplicado of ['1e2', '-100', '1.000', '0', '10000000000', '']) assert.equal(evaluarPagosMixtos('100', [{ ...efectivo, aplicado }]).valido, false)
  const r = evaluarPagosMixtos('9999999999.99', [{ ...efectivo, aplicado: '9999999999.99', entregado: '9999999999.99' }, { ...yape, aplicado: '9999999999.99' }])
  assert.equal(r.exceso, '9999999999.99'); assert.equal(r.valido, false)
})
test('canje condicionado por saldo y permiso, sin vuelto digital ni doble descuento', () => {
  const canje = { disponible: true, saldo_puntos: 20, valor_punto_pen: '0.50' }
  const filas = [{ metodo: 'puntos_vip', puntos: '20' }, { ...efectivo, aplicado: '90', entregado: '100' }]
  const r = evaluarPagosMixtos('100', filas, canje)
  assert.ok(r.valido); assert.equal(r.vuelto, '10.00'); assert.equal(r.pagos[0].monto_pagado, '10.00')
  assert.equal(evaluarPagosMixtos('100', filas, { ...canje, disponible: false }).valido, false)
  assert.equal(evaluarPagosMixtos('100', [{ ...filas[0], puntos: '21' }, filas[1]], canje).valido, false)
  assert.ok(!('monto_entregado' in r.pagos[0]))
})
test('comando solo con total oficial, pedido vigente y sesión propia, sin importes calculados extras', () => {
  const contexto = { pedido: { id: '9007199254740993', version: 4, total: '100.00', estado_cuenta: 'abierta' }, sesion_caja: { id: 1 } }
  const c = prepararComandoPago(contexto, [efectivo, yape])
  assert.deepEqual(Object.keys(c), ['pedidoId', 'version', 'sesion_caja_id', 'pagos'])
  assert.equal(c.pedidoId, '9007199254740993')
  assert.throws(() => prepararComandoPago({ ...contexto, sesion_caja: null }, [efectivo, yape]))
  assert.throws(() => prepararComandoPago({ ...contexto, pedido: { ...contexto.pedido, estado_cuenta: 'pagada' } }, [efectivo, yape]))
})
