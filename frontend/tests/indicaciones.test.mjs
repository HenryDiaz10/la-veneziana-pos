import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarLineaCarrito, useCartStore } from '../src/stores/useCartStore.js'
import { guardarCarrito, leerCarritoGuardado } from '../src/utils/carrito-persistencia.js'
import { construirComandoCarrito, estimarSeleccionCarrito } from '../src/utils/carrito-estimacion.js'
const base = { productoId: 1, varianteId: null, modificadoresIds: [11], cantidad: 1 }
const producto = { id: 1, nombre: 'Caldo de gallina', estado: 'activo', precio_venta_base: '14.00' }
const configuracion = { productoId: 1, variantes: [], grupos: [{ id: 4, nombre_grupo: 'Presa', es_multiple: false, es_obligatorio: true,
  opciones: [{ id: 11, grupo_id: 4, nombre_modificador: 'Pecho', precio_adicional: '0.00' }, { id: 12, grupo_id: 4, nombre_modificador: 'Pierna', precio_adicional: '0.00' }] }] }
test('notas normalizadas y acotadas sin romper las líneas antiguas ni aceptar campos sensibles', () => {
  assert.deepEqual(normalizarLineaCarrito(base), base)
  assert.equal(normalizarLineaCarrito({ ...base, indicaciones: '  Sin cebolla\n poco ají  ' }).indicaciones, 'Sin cebolla poco ají')
  for (const indicaciones of [null, 8, {}, 'x'.repeat(251), 'texto\u0000']) assert.throws(() => normalizarLineaCarrito({ ...base, indicaciones }))
  assert.throws(() => normalizarLineaCarrito({ ...base, total: '0.00' }))
})
test('las presas son obligatorias, exclusivas y no cambian el precio; las notas tampoco', () => {
  const estimar = seleccion => estimarSeleccionCarrito({ producto, configuracion, seleccion })
  assert.throws(() => estimar({ ...base, modificadoresIds: [] }))
  assert.throws(() => estimar({ ...base, modificadoresIds: [11, 12] }))
  assert.equal(estimar({ ...base, indicaciones: 'Sin cebolla' }).precioUnitario, '14.00')
  assert.equal(estimar({ ...base, modificadoresIds: [12] }).precioUnitario, '14.00')
})
test('preparaciones distintas se mantienen separadas; cantidad, edición y persistencia conservan la nota', () => {
  useCartStore.setState({ lineas: [] })
  const uno = useCartStore.getState().agregarLinea({ ...base, indicaciones: 'Sin cebolla' })
  useCartStore.getState().agregarLinea({ ...base, modificadoresIds: [12], indicaciones: 'Poco ají' })
  useCartStore.getState().actualizarLinea(uno, { cantidad: 2 })
  assert.equal(useCartStore.getState().lineas[0].indicaciones, 'Sin cebolla')
  assert.equal(useCartStore.getState().lineas.length, 2)
  const memoria = new Map()
  const original = globalThis.localStorage
  globalThis.localStorage = { getItem: clave => memoria.get(clave) ?? null, setItem: (clave, valor) => memoria.set(clave, valor) }
  try {
    const lineas = useCartStore.getState().lineas
    assert.ok(guardarCarrito(9, lineas).guardado)
    assert.deepEqual(leerCarritoGuardado(9).lineas, lineas)
    const comando = construirComandoCarrito(lineas)
    assert.equal(comando.lineas[0].indicaciones, 'Sin cebolla')
    assert.ok(!('precio' in comando.lineas[0]))
    useCartStore.getState().actualizarLinea(uno, { indicaciones: '' })
    assert.ok(!('indicaciones' in useCartStore.getState().lineas[0]))
  } finally { globalThis.localStorage = original; useCartStore.setState({ lineas: [] }) }
})
