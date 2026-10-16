import test from 'node:test'
import assert from 'node:assert/strict'
import { useCartStore, normalizarLineaCarrito } from '../src/stores/useCartStore.js'
import { calcularLineaCarrito } from '../src/utils/carrito-calculo.js'
import { estimarBorrador, estimarSeleccionCarrito, construirComandoCarrito } from '../src/utils/carrito-estimacion.js'
import { guardarCarrito, leerCarritoGuardado } from '../src/utils/carrito-persistencia.js'

const producto = { id: 1, nombre: 'Pizza', estado: 'activo', precio_venta_base: '25.10' }
const configuracion = {
  productoId: 1,
  variantes: [{ id: 2, nombre_variante: 'Familiar', precio_adicional: '5.20' }],
  grupos: [{ id: 3, nombre_grupo: 'Extras', es_multiple: false, es_obligatorio: true,
    opciones: [{ id: 4, grupo_id: 3, nombre_modificador: 'Queso', precio_adicional: '0.10' },
      { id: 5, grupo_id: 3, nombre_modificador: 'Aceitunas', precio_adicional: '0.20' }] }]
}
const seleccion = { productoId: 1, varianteId: 2, modificadoresIds: [4], cantidad: 2 }
const catalogo = { 1: { producto, configuracion } }
const memoria = new Map()
globalThis.localStorage = {
  getItem: clave => memoria.get(clave) ?? null,
  setItem: (clave, valor) => memoria.set(clave, valor)
}

test('comando de pedido contiene solo selecciones y nunca el total del cliente', () => {
  assert.deepEqual(construirComandoCarrito([{ id: 'local', ...seleccion, total: '0.01', token: 'no-permitido' }]),
    { lineas: [seleccion] })
  assert.throws(() => construirComandoCarrito([]))
})

test('dinero exacto: adicionales, cantidad y límites', () => {
  assert.deepEqual(calcularLineaCarrito({ precioBase: '0.10', adicionales: ['0.20'], cantidad: 3 }),
    { precioUnitario: '0.30', total: '0.90' })
  for (const precioBase of [0.1, '-1.00', '1.001', '1e2']) {
    assert.throws(() => calcularLineaCarrito({ precioBase }))
  }
  assert.throws(() => calcularLineaCarrito({ precioBase: '9999999999.99', cantidad: 10000 }))
})

test('rechaza campos sensibles, IDs inválidos y modificadores duplicados', () => {
  for (const cambios of [{ token: 'no-permitido' }, { cantidad: 0 }, { productoId: -1 },
    { modificadoresIds: [4, 4] }, { varianteId: 1.5 }]) {
    assert.throws(() => normalizarLineaCarrito({ ...seleccion, ...cambios }))
  }
})

test('treinta líneas, cambio de variante y cantidad, recarga sin credenciales', () => {
  useCartStore.setState({ lineas: [] })
  useCartStore.getState().agregarLineas(Array.from({ length: 30 }, () => seleccion))
  let lineas = useCartStore.getState().lineas
  assert.equal(new Set(lineas.map(linea => linea.id)).size, 30)
  useCartStore.getState().actualizarLinea(lineas[0].id, { varianteId: null, cantidad: 3 })
  lineas = useCartStore.getState().lineas
  assert.equal(guardarCarrito(11, lineas).guardado, true)
  useCartStore.setState({ lineas: [] }) // Simular la pérdida de memoria al recargar.
  const recuperado = leerCarritoGuardado(11)
  useCartStore.setState({ lineas: recuperado.lineas })
  assert.deepEqual(useCartStore.getState().lineas, lineas)
  assert.equal(estimarBorrador(lineas, catalogo).total, '1838.80')
  const guardado = JSON.parse(memoria.get('la-veneziana-carrito-v1:11'))
  for (const linea of guardado.lineas) {
    assert.deepEqual(Object.keys(linea).sort(), ['cantidad', 'id', 'modificadoresIds', 'productoId', 'varianteId'])
  }
  assert.deepEqual(leerCarritoGuardado(12).lineas, [])
})

test('lote inválido o fuera de capacidad no añade líneas parcialmente', () => {
  useCartStore.setState({ lineas: [] })
  assert.throws(() => useCartStore.getState().agregarLineas([seleccion, { ...seleccion, cantidad: 0 }]))
  assert.equal(useCartStore.getState().lineas.length, 0)
  useCartStore.getState().agregarLineas(Array.from({ length: 100 }, () => seleccion))
  assert.throws(() => useCartStore.getState().agregarLinea(seleccion))
  assert.equal(useCartStore.getState().lineas.length, 100)
})

test('opciones obligatorias, exclusividad y relaciones se validan', () => {
  for (const cambios of [{ varianteId: 999 }, { modificadoresIds: [] },
    { modificadoresIds: [4, 5] }, { modificadoresIds: [999] }]) {
    assert.throws(() => estimarSeleccionCarrito({ producto, configuracion, seleccion: { ...seleccion, ...cambios } }))
  }
})

test('catálogo actualizado recalcula; una línea inválida impide el total parcial', () => {
  const linea = { id: 'linea', ...seleccion }
  assert.equal(estimarBorrador([linea], catalogo).total, '60.80')
  assert.equal(estimarBorrador([linea], { 1: { producto: { ...producto, precio_venta_base: '26.10' }, configuracion } }).total, '62.80')
  assert.equal(estimarBorrador([linea, { ...linea, id: 'retirada', productoId: 9 }], catalogo).total, null)
  assert.equal(estimarBorrador([linea], { 1: { producto: { ...producto, estado: 'inactivo' }, configuracion } }).total, null)
})

test('persistencia descarta datos adicionales y tolera corrupción y bloqueo', () => {
  const linea = { id: crypto.randomUUID(), ...seleccion, token: 'dato-no-permitido', precio: '0.01' }
  assert.equal(guardarCarrito(20, [linea]).guardado, true)
  assert.equal(memoria.get('la-veneziana-carrito-v1:20').includes('dato-no-permitido'), false)
  memoria.set('la-veneziana-carrito-v1:20', '{json dañado')
  assert.ok(leerCarritoGuardado(20).aviso)
  const original = globalThis.localStorage
  try {
    globalThis.localStorage = { getItem() { throw Error('bloqueado') }, setItem() { throw Error('cuota') } }
    assert.ok(leerCarritoGuardado(20).aviso)
    assert.equal(guardarCarrito(20, [linea]).guardado, false)
  } finally { globalThis.localStorage = original }
})
