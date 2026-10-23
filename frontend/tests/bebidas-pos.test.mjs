import test from 'node:test'
import assert from 'node:assert/strict'
import { agruparBebidasPos, obtenerFamiliaBebida, obtenerPresentacionesBebida } from '../src/utils/bebidas-pos.js'
import { productosCarta } from '../../backend/data/carta-veneziana.mjs'
import { useCartStore } from '../src/stores/useCartStore.js'
import { estimarBorrador, construirComandoCarrito } from '../src/utils/carrito-estimacion.js'
const catalogo = productosCarta.map((p, i) => Object.freeze({ id:i+1, sku:p.sku, nombre:p.nombre,
  precio_venta_base:p.precio, categoria_id:1, estado:'activo' }))

test('97 artículos se presentan en 87 tarjetas con solo tres marcas agrupadas, sin mutar el catálogo', () => {
  const tarjetas = agruparBebidasPos(catalogo)
  assert.equal(tarjetas.length, 87)
  assert.deepEqual(tarjetas.filter(p => p.esGrupoBebida).map(p => [p.nombre,p.presentacionesCount]).sort(),
    [['Agua San Luis',2],['Coca-Cola',5],['Inca Kola',6]])
  assert.equal(catalogo.length,97)
  for (const tarjeta of tarjetas.filter(p => p.esGrupoBebida)) assert.equal(tarjeta.precio_venta_base,'3.00')
})

test('tamaños por marca, agua de 625 ml y exclusividad de gordita, sin agrupar artículos desconocidos', () => {
  assert.deepEqual(obtenerPresentacionesBebida(catalogo,'inca-kola').map(p => obtenerFamiliaBebida(p).presentacion),
    ['Personal','500 ml','Gordita','1 litro','1.5 litros','3 litros'])
  assert.equal(obtenerPresentacionesBebida(catalogo,'coca-cola').some(p => p.nombre.includes('gordita')),false)
  assert.deepEqual(obtenerPresentacionesBebida(catalogo,'san-luis').map(p => obtenerFamiliaBebida(p).presentacion),['625 ml','1 litro'])
  const ajeno = { id:999, nombre:'Coca-Cola', sku:'OTRO-SKU', estado:'activo' }
  assert.deepEqual(agruparBebidasPos([ajeno]),[ajeno])
})

test('búsqueda de volumen conserva el artículo coincidente y las presentaciones inactivas quedan excluidas', () => {
  const coincidencias = catalogo.filter(p => obtenerFamiliaBebida(p)?.presentacion === '1 litro')
  const tarjetas = agruparBebidasPos(coincidencias)
  assert.equal(tarjetas.length,3)
  for (const p of tarjetas) assert.ok(coincidencias.some(c => c.id === p.productoPreferidoId))
  const inactivas = catalogo.map(p => p.sku === 'CARTA-FRI-COCA-3L' ? {...p,estado:'inactivo'} : p)
  assert.equal(obtenerPresentacionesBebida(inactivas,'coca-cola').length,4)
})

test('cambiar tamaño conserva ID de línea y cantidad, pero usa el producto real y su precio completo', () => {
  const personal = catalogo.find(p => p.sku === 'CARTA-FRI-COCA-PERSONAL')
  const litro = catalogo.find(p => p.sku === 'CARTA-FRI-COCA-1L')
  useCartStore.setState({lineas:[]})
  useCartStore.getState().agregarLinea({productoId:personal.id, cantidad:2})
  const id = useCartStore.getState().lineas[0].id
  useCartStore.getState().actualizarLinea(id,{productoId:litro.id})
  const lineas = useCartStore.getState().lineas
  assert.equal(lineas[0].id,id)
  assert.equal(lineas[0].cantidad,2)
  assert.equal(estimarBorrador(lineas,{[litro.id]:{producto:litro,configuracion:{productoId:litro.id,variantes:[],grupos:[]}}}).total,'16.00')
  const comando = construirComandoCarrito(lineas)
  assert.equal(comando.lineas[0].productoId,litro.id)
  assert.equal(comando.lineas[0].varianteId,null)
  assert.ok(!JSON.stringify(comando).includes('bebida-'))
})
