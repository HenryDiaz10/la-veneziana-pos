import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errores = []
page.on('pageerror', e => errores.push(e.message))
const producto = { id: 7, nombre: 'Pizza de prueba', estado: 'activo', precio_venta_base: '20.00', tipo_producto: 'plato_preparado', imagen_url: null }
const configuracion = { productoId: 7, variantes: [], grupos: [
  { id: 1, nombre_grupo: 'Preparación', es_obligatorio: true, es_multiple: false, opciones: [{ id: 11, grupo_id: 1, nombre_modificador: 'Normal', precio_adicional: '0.00', es_exclusion: false }, { id: 12, grupo_id: 1, nombre_modificador: 'Tostada', precio_adicional: '0.00', es_exclusion: false }] },
  { id: 2, nombre_grupo: 'Extras y exclusiones', es_obligatorio: false, es_multiple: true, opciones: [{ id: 21, grupo_id: 2, nombre_modificador: 'Queso extra', precio_adicional: '3.00', es_exclusion: false }, { id: 22, grupo_id: 2, nombre_modificador: 'Sin aceitunas', precio_adicional: '0.00', es_exclusion: true }] },
  { id: 3, nombre_grupo: 'Salsa', es_obligatorio: false, es_multiple: false, opciones: [{ id: 31, grupo_id: 3, nombre_modificador: 'Suave', precio_adicional: '0.00', es_exclusion: false }, { id: 32, grupo_id: 3, nombre_modificador: 'Picante', precio_adicional: '0.00', es_exclusion: false }] }
] }
let retirada = false, corrupta = false, fallo = false
await context.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  assert.equal(req.method(), 'GET', 'Personalizar y revisar el borrador no escribe en servidor')
  let json
  if (ruta === '/auth/session') json = { usuario: { id: 9876, nombre: 'Prueba modificadores', rol: { nombre: 'cajero' }, permisos: [{ modulo: 'ventas', accion: 'cobrar' }, { modulo: 'pedidos', accion: 'crear' }] } }
  else if (ruta === '/pos/catalogo') json = { categorias: [], productos: [producto], total: 1 }
  else if (ruta === '/pedidos/registro') json = { mesas: [] }
  else if (ruta === '/pos/productos/7') {
    if (fallo) return route.fulfill({ status: 503, json: { mensaje: 'Opciones temporalmente no disponibles' } })
    const c = structuredClone(configuracion)
    if (retirada) c.grupos[1].opciones.pop()
    if (corrupta) c.grupos[1].opciones[0].es_exclusion = 'false'
    json = { producto, configuracion: c }
  } else throw new Error(`Ruta inesperada: ${ruta}`)
  await route.fulfill({ json })
})
const modal = () => page.getByRole('dialog')
const añadir = () => page.getByRole('button', { name: 'Añadir Pizza de prueba al pedido', exact: true })
const confirmar = () => modal().getByRole('button', { name: 'Añadir al pedido', exact: true })
try {
  await page.goto('http://localhost:5173/pos')
  await añadir().click()
  await modal().getByRole('radio', { name: /Normal/ }).waitFor()
  assert.ok(await confirmar().isDisabled())
  await modal().getByRole('radio', { name: /Normal/ }).check()
  await modal().getByRole('radio', { name: /Tostada/ }).check()
  assert.ok(!(await modal().getByRole('radio', { name: /Normal/ }).isChecked()))
  await modal().getByRole('checkbox', { name: /Suave/ }).check()
  await modal().getByRole('checkbox', { name: /Picante/ }).check()
  assert.ok(!(await modal().getByRole('checkbox', { name: /Suave/ }).isChecked()))
  await modal().getByRole('checkbox', { name: /Picante/ }).uncheck()
  await modal().getByRole('checkbox', { name: /Queso extra/ }).check()
  await modal().getByRole('checkbox', { name: /Sin aceitunas/ }).check()
  const notas = '  Bien caliente, <b>poco ají</b>  '
  await modal().getByLabel(/Indicaciones para cocina/).fill(notas)
  await modal().getByLabel('Cantidad a preparar', { exact: true }).fill('2')
  await modal().getByRole('list', { name: 'Opciones seleccionadas', exact: true }).getByText('Excluir: Sin aceitunas', { exact: true }).waitFor()
  for (const width of [320, 390, 768, 1366]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(t => { document.documentElement.dataset.tema = t }, tema)
    const medidas = await modal().evaluate(el => ({ ancho: el.clientWidth, contenido: el.scrollWidth, foco: el.contains(document.activeElement) }))
    assert.ok(medidas.contenido <= medidas.ancho + 1, `Overflow ${width}/${tema}`)
    if (process.argv[3] && [390, 1366].includes(width)) {
      await modal().evaluate(el => { el.scrollTop = 0 })
      await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
      await modal().evaluate(el => { el.scrollTop = el.scrollHeight })
      await page.screenshot({ path: `${process.argv[3]}-notas-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  await confirmar().click()
  const recibo = page.locator('.pos-receipt')
  await recibo.getByText('Excluir: Sin aceitunas', { exact: true }).waitFor()
  await recibo.getByText('Cocina: Bien caliente, <b>poco ají</b>', { exact: true }).waitFor()
  assert.equal(await recibo.locator('b').count(), 0, 'Notas como texto, nunca HTML')
  await page.reload()
  await recibo.getByText('Excluir: Sin aceitunas', { exact: true }).waitFor()
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9876')))
  assert.deepEqual(guardado.lineas[0].modificadoresIds, [12, 21, 22])
  assert.ok(!JSON.stringify(guardado).includes('es_exclusion') && !JSON.stringify(guardado).includes('3.00'))
  await recibo.getByRole('button', { name: /Revisar/ }).click()
  await page.getByRole('list', { name: 'Preparaciones del borrador' }).getByText('Excluir: Sin aceitunas', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Volver al borrador', exact: true }).click()
  retirada = true
  await recibo.getByRole('button', { name: 'Editar línea 1', exact: true }).click()
  await modal().getByRole('button', { name: 'Retirar', exact: true }).click()
  assert.equal(await modal().getByLabel(/Indicaciones para cocina/).inputValue(), 'Bien caliente, <b>poco ají</b>')
  await modal().getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  assert.equal(await recibo.getByText('Excluir: Sin aceitunas', { exact: true }).count(), 0)
  corrupta = true
  await añadir().click(); await modal().getByRole('alert').waitFor()
  assert.ok(await confirmar().isDisabled())
  await modal().getByRole('button', { name: 'Cancelar', exact: true }).click()
  corrupta = false; fallo = true
  await añadir().click(); await modal().getByText('Opciones temporalmente no disponibles', { exact: true }).waitFor()
  assert.ok(await confirmar().isDisabled())
  assert.equal(new URL(page.url()).pathname, '/pos')
  await page.keyboard.press('Escape')
  assert.deepEqual(errores, [])
  console.log('OK fase 35: grupos obligatorios/múltiples/exclusivos, etiquetas de exclusión, notas como texto, edición/F5, retiro de opción, contrato inválido/red sin logout y modal 320-1366px en ambos temas.')
} finally { await context.close(); await browser.close() }
