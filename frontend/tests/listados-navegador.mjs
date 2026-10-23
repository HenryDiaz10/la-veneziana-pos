// Regresión visual funcional con API simulada: no usa credenciales ni cambia la BD.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime = process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(runtime).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errores = []
page.on('pageerror', e => errores.push(e.message))
const usuario = { id: 9876, nombre: 'Prueba listados', rol: { nombre: 'administrador' }, permisos: [
  ['catalogo', 'gestionar'], ['inventario', 'gestionar'], ['clientes', 'buscar'], ['clientes', 'gestionar'], ['ventas', 'cobrar']
].map(([modulo, accion]) => ({ modulo, accion })) }
let bloqueo = null
function demorar(ruta, pagina = 2, status = 200) {
  let llegada, liberar
  const iniciada = new Promise(resolve => { llegada = resolve })
  const espera = new Promise(resolve => { liberar = resolve })
  bloqueo = { ruta, pagina, status, llegada, espera }
  return { iniciada, liberar }
}
await context.route('**/api/**', async route => {
  const url = new URL(route.request().url()), ruta = url.pathname.replace(/^\/api/, '')
  const pagina = Number(url.searchParams.get('pagina') ?? 1)
  const paginacion = { pagina, limite: 20, total: 23, totalPaginas: 2 }
  const producto = { id: pagina, nombre: `Producto página ${pagina}`, sku: `PRUEBA-${pagina}`, estado: 'activo', precio_venta_base: '10.00', tipo_producto: 'plato_preparado', imagen_url: null }
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario }
  else if (ruta === '/productos') body = { productos: [producto], paginacion }
  else if (ruta === '/categorias') body = { categorias: [{ id: pagina, nombre: `Categoría página ${pagina}`, slug: `prueba-${pagina}`, activa: true }], paginacion }
  else if (ruta === '/inventario') body = { insumos: [{ id: pagina, nombre: `Insumo página ${pagina}`, codigo: `INS-${pagina}`, unidad: 'un', activo: true, alerta: 'normal', stock_fisico: '10', disponible: '10' }], paginacion, resumen: { total: 23, bajos: 1, agotados: 0, quiebres: 0 } }
  else if (ruta === '/compras') body = { compras: [{ id: pagina, numero_factura: `Compra página ${pagina}`, razon_social: 'Proveedor de prueba', estado_registro: 'borrador', total: '10.00', fecha_emision: '2026-10-17' }], paginacion }
  else if (ruta === '/compras/proveedores') body = { proveedores: [{ id: pagina, razon_social: `Proveedor página ${pagina}`, ruc: '20123456789', estado: 'activo' }], paginacion }
  else if (ruta === '/clientes') body = { clientes: [{ id: pagina, nombres: `Cliente página ${pagina}`, numero_documento: '12345678', telefono_principal: '999999999' }], paginacion }
  else if (ruta === '/pos/catalogo') body = { categorias: [{ id: 1, nombre: 'Pizzas' }], productos: [{ ...producto, nombre: url.searchParams.get('categoriaId') ? 'Pizza filtrada' : 'Pizza inicial' }], total: 1 }
  else throw new Error(`Ruta no simulada: ${ruta}`)
  if (bloqueo?.ruta === ruta && bloqueo.pagina === pagina) {
    const actual = bloqueo
    bloqueo = null
    actual.llegada()
    await actual.espera
    status = actual.status
    if (status !== 200) body = { mensaje: 'No se pudo consultar el listado de prueba.' }
  }
  await route.fulfill({ status, json: body })
})
async function comprobarPagina({ url, ruta, navNombre, anterior, siguiente, preparar }) {
  await page.goto(`http://localhost:5173${url}`)
  await preparar?.()
  const table = page.locator('table').filter({ hasText: anterior })
  await table.getByText(anterior, { exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  const nav = page.getByRole('navigation', { name: navNombre, exact: true })
  await nav.scrollIntoViewIfNeeded()
  const antes = await table.boundingBox(), scroll = await page.evaluate(() => scrollY)
  const espera = demorar(ruta)
  await nav.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await espera.iniciada
  assert.ok(await table.getByText(anterior, { exact: true }).isVisible())
  assert.equal(await table.getAttribute('inert'), '')
  assert.equal((await table.boundingBox()).height, antes.height)
  assert.equal(await page.evaluate(() => scrollY), scroll)
  assert.ok(await nav.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled())
  assert.match(await nav.innerText(), /Página 1 de 2/)
  espera.liberar()
  await page.locator('table').getByText(siguiente, { exact: true }).waitFor()
  assert.equal(await page.locator('table').first().getAttribute('inert'), null)
  console.log(`OK: ${url} conserva filas, altura, scroll y paginación durante la consulta.`)
}
try {
  await comprobarPagina({ url: '/inventario', ruta: '/inventario', navNombre: 'Páginas del inventario', anterior: 'Insumo página 1', siguiente: 'Insumo página 2' })
  await comprobarPagina({ url: '/compras', ruta: '/compras', navNombre: 'Páginas de compras y proveedores', anterior: 'Compra página 1', siguiente: 'Compra página 2' })
  await comprobarPagina({ url: '/compras', ruta: '/compras/proveedores', navNombre: 'Páginas de compras y proveedores', anterior: 'Proveedor página 1', siguiente: 'Proveedor página 2', preparar: () => page.getByRole('button', { name: 'Proveedores', exact: true }).click() })
  // Cambiar de recurso no debe reutilizar filas de proveedores como compras.
  const cambio = demorar('/compras', 1)
  await page.getByRole('button', { name: 'Compras', exact: true }).click()
  await cambio.iniciada
  assert.equal(await page.locator('table tbody').getByText('Proveedor página 2', { exact: true }).count(), 0)
  cambio.liberar()
  await page.locator('table').getByText('Compra página 1', { exact: true }).waitFor()
  await comprobarPagina({ url: '/clientes', ruta: '/clientes', navNombre: 'Paginación de clientes', anterior: 'Cliente página 1', siguiente: 'Cliente página 2', preparar: async () => {
    await page.getByLabel('Número de documento', { exact: true }).fill('12345678')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  } })
  // Un error debe retirar los registros anteriores y permitir un reintento real.
  const fallo = demorar('/clientes', 1, 503)
  await page.getByRole('navigation', { name: 'Paginación de clientes', exact: true }).getByRole('button', { name: 'Anterior', exact: true }).click()
  await fallo.iniciada
  fallo.liberar()
  await page.getByRole('alert').getByText('No se pudo consultar el listado de prueba.', { exact: true }).waitFor()
  assert.equal(await page.locator('table tbody').getByText('Cliente página 2', { exact: true }).count(), 0)
  // Las tarjetas de categorías tampoco se desmontan al paginar.
  await page.goto('http://localhost:5173/catalogo')
  await page.getByRole('heading', { name: 'Categoría página 1', exact: true }).waitFor()
  const categorias = page.getByRole('navigation', { name: 'Paginación de categorías', exact: true })
  const espera = demorar('/categorias')
  await categorias.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await espera.iniciada
  assert.ok(await page.getByRole('heading', { name: 'Categoría página 1', exact: true }).isVisible())
  assert.equal(await page.locator('ul[inert]').count(), 1)
  espera.liberar()
  await page.getByRole('heading', { name: 'Categoría página 2', exact: true }).waitFor()
  // El selector de recetas conserva resultados, pero no permite elegirlos pendientes.
  await page.goto('http://localhost:5173/recetas')
  await page.getByRole('button', { name: 'Elegir producto', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Producto página 1', { exact: true }).waitFor()
  const selector = demorar('/productos')
  await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await selector.iniciada
  assert.ok(await dialog.getByText('Producto página 1', { exact: true }).isVisible())
  assert.equal(await dialog.locator('ul').getAttribute('inert'), '')
  selector.liberar()
  await dialog.getByText('Producto página 2', { exact: true }).waitFor()
  // El catálogo POS mantiene tarjetas y categorías al cambiar filtros.
  await page.goto('http://localhost:5173/pos')
  await page.getByRole('heading', { name: 'Pizza inicial', exact: true }).waitFor()
  const filtro = demorar('/pos/catalogo', 1)
  await page.getByRole('tab', { name: 'Pizzas', exact: true }).click()
  await filtro.iniciada
  assert.ok(await page.getByRole('heading', { name: 'Pizza inicial', exact: true }).isVisible())
  assert.equal(await page.locator('.pos-products-grid').getAttribute('inert'), '')
  filtro.liberar()
  await page.getByRole('heading', { name: 'Pizza filtrada', exact: true }).waitFor()
  assert.equal(await page.locator('.pos-products-grid').getAttribute('inert'), null)
  assert.deepEqual(errores, [])
  console.log('OK: categorías, selector de recetas y POS estables; un error no deja registros anteriores operativos.')
} finally {
  await context.close()
  await browser.close()
}
