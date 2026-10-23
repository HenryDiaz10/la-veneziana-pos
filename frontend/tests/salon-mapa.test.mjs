import test from 'node:test'
import assert from 'node:assert/strict'
import { validarSalon, filtrarMesas, contarMesas, distribuirMesas, etiquetaEstado } from '../src/utils/salon-mapa.js'
const mesa = (id, x, y, estado = 'libre') => ({ id, zona_id: 1, codigo_mesa: `M${id}`, capacidad_sillas: 4, estado_actual: estado, mesero_asignado_id: id % 2 ? 7 : null, posicion_x: x, posicion_y: y })
const datos = () => ({ consultado_en: '2026-10-23T18:00:00Z', zonas: [{ id: 1, nombre: 'Salón', aforo_maximo: 30 }], mesas: [mesa(1, 0, 0), mesa(2, 100, 0, 'ocupada'), mesa(3, 0, 100, 'sucia_por_limpiar'), mesa(4, 100, 100, 'inhabilitada')] })
test('contrato completo: estados SQL, zona existente, IDs y códigos únicos; null nunca significa libre', () => {
  assert.equal(validarSalon(datos()).mesas.length, 4)
  const nulo = datos(); nulo.mesas[0].estado_actual = null
  assert.equal(etiquetaEstado(validarSalon(nulo).mesas[0].estado_actual), 'Sin estado registrado')
  for (const cambio of [d => d.mesas.push({ ...d.mesas[0] }), d => { d.mesas[0].zona_id = 99 }, d => { d.mesas[0].estado_actual = 'sucia' }, d => { d.mesas[0].posicion_x = 1.5 }, d => { d.consultado_en = 'incorrecto' }]) {
    const d = datos(); cambio(d); assert.throws(() => validarSalon(d))
  }
})
test('filtros combinados por zona, código, estado y asignación sin mutar ni confundir null con empleado', () => {
  const d = datos(), original = structuredClone(d)
  assert.deepEqual(filtrarMesas(d.mesas, { zonaId: 1, busqueda: ' m1 ', soloMias: true, usuarioId: 7 }).map(m => m.id), [1])
  assert.equal(filtrarMesas(d.mesas, { zonaId: 2 }).length, 0)
  assert.equal(filtrarMesas(d.mesas, { estado: 'ocupada', soloMias: true, usuarioId: 7 }).length, 0)
  assert.deepEqual(contarMesas([...d.mesas, { ...mesa(5, 1, 1), estado_actual: null }]), { total: 5, libre: 1, ocupada: 1, sucia_por_limpiar: 1, inhabilitada: 1, sin_estado: 1 })
  assert.deepEqual(d, original)
})
test('croquis normaliza coordenadas negativas/extremas y mantiene botones dentro del contenedor', () => {
  const mesas = [mesa(1, -2147483648, -5), mesa(2, 2147483647, 8)]
  const r = distribuirMesas(mesas, 600)
  assert.equal(r.modo, 'mapa')
  assert.ok(r.posiciones.every(p => p.x >= 80 && p.x <= 520 && p.y >= 68 && p.y <= 412))
  assert.equal(distribuirMesas([mesa(1, 0, 0)], 600).posiciones[0].x, 300)
})
test('posiciones repetidas, ausentes, densas o poco espacio usan cuadrícula sin omitir mesas', () => {
  assert.equal(distribuirMesas([mesa(1, 0, 0), mesa(2, 0, 0)], 800).modo, 'cuadricula')
  assert.equal(distribuirMesas([mesa(1, null, 0)], 800).modo, 'cuadricula')
  assert.equal(distribuirMesas(datos().mesas, 390).modo, 'cuadricula')
  assert.equal(distribuirMesas([mesa(1, 0, 0), mesa(2, 1, 0), mesa(3, 100, 0)], 600).modo, 'cuadricula')
  assert.equal(distribuirMesas([], 600).modo, 'vacio')
})
