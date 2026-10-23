// API simulada: verificar preparación, edición y persistencia sin crear pedidos.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime = process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(runtime).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
const errores = []
page.on('pageerror', e => errores.push(e.message))
const usuario = { id: 9876, nombre: 'Prueba cocina', rol: { nombre: 'cajero' }, permisos: [{ modulo: 'ventas', accion: 'cobrar' }] }
const producto = { id: 7, nombre: 'Caldo de gallina especial', estado: 'activo', precio_venta_base: '14.00', tipo_producto: 'plato_preparado', imagen_url: null }
const configuracion = { productoId: 7, variantes: [], grupos: [{ id: 4, nombre_grupo: 'Presa del caldo de gallina', es_obligatorio: true, es_multiple: false,
  opciones: [{ id: 11, grupo_id: 4, nombre_modificador: 'Pecho (pechuga)', precio_adicional: '0.00' }, { id: 12, grupo_id: 4, nombre_modificador: 'Pierna', precio_adicional: '0.00' }] }] }
await context.route('**/api/**', async route => {
  const ruta = new URL(route.request().url()).pathname.replace(/^\/api/, '')
  const body = ruta === '/auth/session' ? { usuario } : ruta === '/pos/catalogo' ? { categorias: [], productos: [producto], total: 1 } : ruta === '/pos/productos/7' ? { producto, configuracion } : null
  assert.ok(body, `Ruta no simulada: ${ruta}`)
  await route.fulfill({ json: body })
})
try {
  await page.goto('http://localhost:5173/pos')
  const añadir = page.getByRole('button', { name: 'Añadir Caldo de gallina especial al pedido', exact: true })
  await añadir.click()
  let modal = page.getByRole('dialog')
  await modal.getByRole('radio', { name: /Pecho/ }).waitFor()
  assert.ok(await modal.getByRole('button', { name: 'Añadir al pedido', exact: true }).isDisabled())
  await modal.getByRole('radio', { name: /Pecho/ }).check()
  await modal.getByRole('radio', { name: /Pierna/ }).check()
  assert.ok(!(await modal.getByRole('radio', { name: /Pecho/ }).isChecked()))
  await modal.getByLabel(/Indicaciones para cocina/).fill('Sin cebolla, poco ají')
  await modal.getByRole('button', { name: 'Añadir al pedido', exact: true }).click()
  const recibo = page.locator('.pos-receipt')
  await recibo.getByText('Cocina: Sin cebolla, poco ají', { exact: true }).waitFor()
  await añadir.click()
  modal = page.getByRole('dialog')
  await modal.getByRole('radio', { name: /Pecho/ }).check()
  await modal.getByLabel(/Indicaciones para cocina/).fill('Bien caliente')
  await modal.getByRole('button', { name: 'Añadir al pedido', exact: true }).click()
  await recibo.getByRole('button', { name: 'Editar línea 1', exact: true }).click()
  modal = page.getByRole('dialog')
  await modal.getByRole('radio', { name: /Pierna/ }).waitFor()
  assert.ok(await modal.getByRole('radio', { name: /Pierna/ }).isChecked())
  assert.equal(await modal.getByLabel(/Indicaciones para cocina/).inputValue(), 'Sin cebolla, poco ají')
  await modal.getByLabel('Cantidad a preparar', { exact: true }).fill('2')
  await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await page.reload()
  await recibo.getByText('Cocina: Sin cebolla, poco ají', { exact: true }).waitFor()
  assert.equal(await recibo.locator('.pos-receipt-line').count(), 2)
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9876')))
  assert.equal(guardado.lineas[0].cantidad, 2)
  assert.deepEqual(guardado.lineas[0].modificadoresIds, [12])
  assert.equal(guardado.lineas[0].indicaciones, 'Sin cebolla, poco ají')
  await recibo.getByRole('button', { name: /Revisar/ }).click()
  await page.getByRole('list', { name: 'Preparaciones del borrador' }).getByText('Cocina: Bien caliente', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Volver al borrador', exact: true }).click()
  // Campo y selección adaptables a celular, sin desbordar el diálogo.
  await page.setViewportSize({ width: 390, height: 844 })
  await añadir.click()
  await page.getByRole('radio', { name: /Pecho/ }).waitFor()
  const ancho = await page.getByRole('dialog').evaluate(e => ({ contenido: e.scrollWidth, visible: e.clientWidth }))
  assert.ok(ancho.contenido <= ancho.visible + 1)
  assert.deepEqual(errores, [])
  console.log('OK: presa obligatoria y exclusiva, indicaciones por línea, edición, cantidad, F5, revisión y modal móvil.')
} finally { await context.close(); await browser.close() }
