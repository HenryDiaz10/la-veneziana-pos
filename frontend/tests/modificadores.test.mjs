import test from 'node:test'
import assert from 'node:assert/strict'
import { estimarSeleccionCarrito, construirComandoCarrito } from '../src/utils/carrito-estimacion.js'
import { etiquetaModificador } from '../src/utils/modificadores.js'
const producto = { id: 1, nombre: 'Pizza', estado: 'activo', precio_venta_base: '20.00' }
const configuracion = { productoId: 1, variantes: [], grupos: [{ id: 2, nombre_grupo: 'Personalización', es_multiple: true, es_obligatorio: false,
  opciones: [{ id: 3, grupo_id: 2, nombre_modificador: 'Queso extra', precio_adicional: '3.00', es_exclusion: false }, { id: 4, grupo_id: 2, nombre_modificador: 'Sin aceitunas', precio_adicional: '0.00', es_exclusion: true }] }] }
const seleccion = { productoId: 1, varianteId: null, modificadoresIds: [3, 4], cantidad: 2, indicaciones: '  Bien   caliente  ' }
test('extras y exclusiones mantienen precio exacto y etiquetas distintas sin convertir exclusión en descuento', () => {
  const r = estimarSeleccionCarrito({ producto, configuracion, seleccion })
  assert.equal(r.total, '46.00'); assert.equal(r.indicaciones, 'Bien caliente')
  assert.deepEqual(r.modificadoresDetalle.map(etiquetaModificador), ['Queso extra', 'Excluir: Sin aceitunas'])
  assert.deepEqual(r.modificadoresNombres, ['Queso extra', 'Sin aceitunas'])
  assert.deepEqual(construirComandoCarrito([{ ...seleccion, ...r }]), { lineas: [{ ...seleccion, indicaciones: 'Bien caliente' }] })
})
test('configuración incoherente se rechaza aun en opciones no seleccionadas; contratos antiguos sin marca siguen válidos', () => {
  for (const cambiar of [c => { c.grupos[0].opciones[1].es_exclusion = 'false' }, c => { c.grupos[0].opciones[1].precio_adicional = 'sin precio' }, c => { c.grupos[0].opciones[1].grupo_id = 99 }, c => { c.grupos[0].opciones.push({ ...c.grupos[0].opciones[0] }) }, c => { c.grupos[0].es_multiple = 'true' }]) {
    const c = structuredClone(configuracion); cambiar(c)
    assert.throws(() => estimarSeleccionCarrito({ producto, configuracion: c, seleccion: { ...seleccion, modificadoresIds: [] } }))
  }
  const antigua = structuredClone(configuracion); delete antigua.grupos[0].opciones[0].es_exclusion
  assert.equal(estimarSeleccionCarrito({ producto, configuracion: antigua, seleccion }).modificadoresDetalle[0].es_exclusion, false)
})
test('notas y exclusiones son independientes: escribir una nota no selecciona una opción ni cambia precio', () => {
  const r = estimarSeleccionCarrito({ producto, configuracion, seleccion: { ...seleccion, modificadoresIds: [], indicaciones: 'Sin aceitunas' } })
  assert.equal(r.total, '40.00'); assert.deepEqual(r.modificadoresDetalle, [])
  assert.throws(() => estimarSeleccionCarrito({ producto, configuracion, seleccion: { ...seleccion, es_exclusion: true } }))
})
