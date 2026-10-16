import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularIngrediente, prepararReceta, filasDesdeReceta } from '../src/utils/recetas.js'

const insumo = { id: 1, nombre: 'Harina', activo: true, unidad: { id: 1, nombre: 'Kilogramo', abreviatura: 'kg' } }
const fila = extra => ({ insumo, clave: '1', cantidad: '200', unidad: 'g', tipo: 'bruta', merma: '20.00', ...extra })

test('200 g brutos se guardan como 0.2000 kg, sin volver a aplicar merma', () => {
  const resultado = calcularIngrediente(fila())
  assert.equal(resultado.bruto, '0.2000')
  assert.equal(resultado.neto, '0.1600')
  assert.equal(resultado.rendimiento, '80.00')
  assert.equal(prepararReceta([fila()], null).datos.ingredientes[0].cantidad_bruta_necesaria, '0.2000')
})

test('200 g netos con 20% merma producen 0.2500 kg brutos una sola vez', () => {
  const entrada = prepararReceta([fila({ tipo: 'neta' })], 2)
  assert.equal(entrada.datos.ingredientes[0].cantidad_bruta_necesaria, '0.2500')
  const reabierta = filasDesdeReceta({ ingredientes: [{ ...entrada.datos.ingredientes[0], insumo }] })
  assert.equal(reabierta[0].tipo, 'bruta')
  assert.equal(calcularIngrediente(reabierta[0]).bruto, '0.2500')
  assert.equal(calcularIngrediente(reabierta[0]).neto, '0.2000')
})

test('convierte volumen y redondea después de la conversión', () => {
  assert.equal(calcularIngrediente(fila({ cantidad: '0.05', merma: '0' })).bruto, '0.0001')
  const salsa = { ...insumo, unidad: { id: 2, nombre: 'Litro', abreviatura: 'L' } }
  assert.equal(calcularIngrediente(fila({ insumo: salsa, cantidad: '125', unidad: 'ml', merma: '0' })).bruto, '0.1250')
  assert.equal(calcularIngrediente(fila({ insumo: salsa, cantidad: '125', unidad: 'g' })).errores.unidad.length > 0, true)
})

test('no publica recetas parciales, duplicadas, inactivas o fuera de rango', () => {
  assert.ok(prepararReceta([], null).error)
  assert.ok(prepararReceta([fila(), fila()], null).error)
  assert.ok(prepararReceta([fila({ cantidad: '' })], null).error)
  assert.ok(prepararReceta([fila({ insumo: { ...insumo, activo: false } })], null).error)
  for (const cantidad of ['0', '-1', 'NaN', '1e2', '1,5', '0.001', '999999999999']) assert.ok(calcularIngrediente(fila({ cantidad })).errores.cantidad)
  for (const merma of ['100', '-1', '', '1.234']) assert.ok(calcularIngrediente(fila({ merma })).errores.merma)
})
