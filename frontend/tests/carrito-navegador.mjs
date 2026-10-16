// Prueba de interfaz con respuestas HTTP simuladas y un contexto aislado.
// No utiliza credenciales reales ni crea productos, ventas o movimientos.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
let usuarioId = 11
let precio = '25.10'
let retirado = false
let autenticado = true
const errores = []
const escrituras = []
page.on('pageerror', error => errores.push(error.message))
const producto = () => ({ id: 1, nombre: 'Pizza de prueba con nombre largo para comprobar el borrador', estado: 'activo', precio_venta_base: precio })
const paginacion = { pagina: 1, limite: 50, total: 1, totalPaginas: 1 }
await context.route('**/api/**', async route => {
  const peticion = route.request()
  const ruta = new URL(peticion.url()).pathname.replace(/^\/api/, '')
  if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204,
    headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'X-CSRF-Protection, Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } })
  let status = 200
  let body
  if (peticion.method() !== 'GET') escrituras.push(ruta)
  if (ruta === '/auth/session') {
    status = autenticado ? 200 : 401
    body = autenticado ? { usuario: { id: usuarioId, nombre: 'Empleado de prueba', rol: { nombre: 'administrador' },
      permisos: [{ modulo: 'catalogo', accion: 'gestionar' }] } } : { mensaje: 'Sin sesión' }
  } else if (ruta === '/auth/logout') {
    autenticado = false
    body = {}
  } else if (ruta === '/productos') body = { productos: [producto()], paginacion }
  else if (ruta === '/productos/1') {
    status = retirado ? 404 : 200
    body = retirado ? { mensaje: 'Producto retirado' } : { producto: producto() }
  } else if (ruta === '/productos/1/variantes') body = {
    variantes: [{ id: 2, nombre_variante: 'Familiar', precio_adicional: '5.20' }], paginacion
  }
  else if (ruta === '/productos/1/modificadores') body = {
    grupos: [{ id: 3, nombre_grupo: 'Extras', es_obligatorio: true, es_multiple: false }], paginacion
  }
  else if (ruta === '/modificadores/3/items') body = {
    items: [{ id: 4, grupo_id: 3, nombre_modificador: 'Queso extra', precio_adicional: '0.10', es_exclusion: false }], paginacion
  }
  else { status = 404; body = { mensaje: `Ruta no simulada: ${ruta}` } }
  return route.fulfill({ status, json: body, headers: {
    'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true'
  } })
})

try {
  await page.goto('http://localhost:5173/pruebas-carrito')
  await page.getByLabel('Producto activo del catálogo').selectOption('1')
  const anadir = page.getByRole('button', { name: 'Añadir selección al borrador', exact: true })
  await page.getByText('Selecciona una opción de «Extras».', { exact: true }).waitFor()
  assert.equal(await anadir.isDisabled(), true)
  await page.getByRole('combobox', { name: /^Variante/ }).selectOption('2')
  await page.getByRole('checkbox', { name: /Queso extra/ }).check()
  await page.getByRole('checkbox', { name: /Añadir 30/ }).check()
  await anadir.click()
  await page.getByText('Total estimado: S/ 912.00', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Aumentar cantidad de la línea 1', exact: true }).click()
  await page.getByText('Total estimado: S/ 942.40', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Editar línea 1', exact: true }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('combobox', { name: /^Variante/ }).selectOption('')
  await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await page.getByText('Total estimado: S/ 932.00', { exact: true }).waitFor()
  await page.reload()
  await page.getByText('Total estimado: S/ 932.00', { exact: true }).waitFor()
  const borrador = await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:11')))
  assert.equal(borrador.lineas.length, 30)
  assert.equal(borrador.lineas[0].cantidad, 2)
  assert.equal(borrador.lineas[0].varianteId, null)
  for (const linea of borrador.lineas) assert.deepEqual(Object.keys(linea).sort(),
    ['cantidad', 'id', 'modificadoresIds', 'productoId', 'varianteId'])

  precio = '26.10'
  await page.getByRole('button', { name: 'Actualizar precios', exact: true }).click()
  await page.getByText('Total estimado: S/ 963.00', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Vaciar borrador', exact: true }).click()
  await page.getByRole('button', { name: 'Conservar borrador', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /^Editar línea / }).count(), 30)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  const cambiarTema = page.getByRole('button', { name: /Modo oscuro/ })
  if (await cambiarTema.count()) await cambiarTema.click()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  retirado = true
  await page.getByRole('button', { name: 'Actualizar precios', exact: true }).click()
  await page.getByText('Corrige las líneas indicadas para calcular el total estimado.', { exact: true }).waitFor()
  assert.equal(await page.getByText(/^Total estimado:/).count(), 0)
  retirado = false
  usuarioId = 12
  await page.reload()
  await page.getByText('El borrador está vacío.', { exact: true }).waitFor()
  usuarioId = 11
  await page.reload()
  await page.getByText('Total estimado: S/ 963.00', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await page.waitForURL('**/login')
  assert.equal(await page.getByRole('button', { name: /^Editar línea / }).count(), 0)
  assert.deepEqual(escrituras, ['/auth/logout'])
  assert.deepEqual(errores, [])
  console.log('OK navegador: 30 líneas, edición, F5, precios actuales, producto retirado, aislamiento, logout, 390 px y temas. API simulada; sin datos reales.')
} finally {
  await context.close()
  await browser.close()
}
