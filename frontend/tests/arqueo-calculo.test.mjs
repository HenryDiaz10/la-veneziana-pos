import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularConteo, prepararCierre, idSesionValido } from '../src/utils/arqueo-calculo.js'
test('conteo directo exige confirmación explícita de cero, acepta coma y no redondea', () => {
  assert.equal(calcularConteo({ modo: 'importe', importe: '158,50' }), '158.50')
  assert.equal(calcularConteo({ modo: 'importe', importe: '0' }), '0.00')
  for (const importe of ['', ' ', '-1', '1e3', '1.001', '10,000.00', '10000000000']) assert.throws(() => calcularConteo({ modo: 'importe', importe }))
})
test('denominaciones suman céntimos exactos; vacíos, negativos o cantidades fraccionarias no cuentan', () => {
  assert.equal(calcularConteo({ modo: 'denominaciones', cantidades: { 10000: '1', 2000: '2', 500: '3', 100: '3', 20: '2', 10: '1' }, otros: '' }), '158.50')
  assert.equal(calcularConteo({ modo: 'denominaciones', cantidades: { 10: '0' }, otros: '' }), '0.00')
  for (const cantidades of [{}, { 100: '-1' }, { 100: '1.5' }, { 100: '1e2' }]) assert.throws(() => calcularConteo({ modo: 'denominaciones', cantidades }))
  assert.equal(calcularConteo({ modo: 'denominaciones', cantidades: { 100: '1' }, otros: '0,05' }), '1.05')
})
test('el comando solo envía conteo, revisión y observaciones sobre una sesión abierta', () => {
  const datos = { estado: 'abierta', revision: 'a'.repeat(64), resumen: { sesion: { id: 7 } } }
  assert.deepEqual(prepararCierre(datos, { modo: 'importe', importe: '158.50' }, ' Revisado '), { sesionId: 7, cuerpo: { cierre_real_efectivo: '158.50', revision: 'a'.repeat(64), observaciones: 'Revisado' } })
  assert.throws(() => prepararCierre({ ...datos, estado: 'cerrada' }, { modo: 'importe', importe: '0' }, ''))
  assert.throws(() => prepararCierre(datos, { modo: 'importe', importe: '1' }, 'x'.repeat(501)))
  assert.ok(idSesionValido('2147483647'))
  for (const id of ['0', '-1', '1e3', '01', '2147483648']) assert.equal(idSesionValido(id), false)
})
