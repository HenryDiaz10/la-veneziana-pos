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
const usuario = { id: 9876, nombre: 'Prueba cocina', rol: { nombre: 'cajero' }, permisos: [{ modulo: 'ventas', accion: 'cobrar' }, { modulo: 'pedidos', accion: 'crear' }, { modulo: 'caja', accion: 'gestionar' }] }
const producto = { id: 7, nombre: 'Caldo de gallina especial', estado: 'activo', precio_venta_base: '14.00', tipo_producto: 'plato_preparado', imagen_url: null }
const configuracion = { productoId: 7, variantes: [], grupos: [{ id: 4, nombre_grupo: 'Presa del caldo de gallina', es_obligatorio: true, es_multiple: false,
  opciones: [{ id: 11, grupo_id: 4, nombre_modificador: 'Pecho (pechuga)', precio_adicional: '0.00' }, { id: 12, grupo_id: 4, nombre_modificador: 'Pierna', precio_adicional: '0.00' }] }] }
let pedidoRegistrado, pagada = false, cajaAbierta = false, version = 1, cobros = 0
const venta = { venta: { id: '77', pedido_id: '42', total: '42.00', serie_correlativo: 'T-PRUEBA', impresion: { job_uid: 'ticket_prueba_123', estado: 'pendiente' } }, pedido: { id: '42', estado_cuenta: 'pagada' } }
await context.route('**/api/**', async route => {
  const ruta = new URL(route.request().url()).pathname.replace(/^\/api/, '')
  if (ruta === '/caja/sesion') return route.fulfill({ json: { cajas: [{ id: 1, nombre_terminal: 'Caja prueba' }], sesion: cajaAbierta ? { id: 1, apertura_monto_base: '100.00' } : null } })
  if (ruta === '/caja/sesiones') { assert.deepEqual(route.request().postDataJSON(), { caja_fisica_id: 1, apertura_monto_base: '100.00' }); cajaAbierta = true; return route.fulfill({ status: 201, json: { sesion: { id: 1 } } }) }
  if (ruta === '/pedidos/registro') return route.fulfill({ json: { mesas: [{ id: 5, codigo_mesa: 'M05' }] } })
  if (ruta === '/pedidos' && route.request().method() === 'POST') {
    pedidoRegistrado = route.request().postDataJSON()
    assert.match(route.request().headers()['idempotency-key'], /^[a-zA-Z0-9_-]{8,64}$/)
    return route.fulfill({ status: 201, json: { pedido: { id: '42', codigo_pedido: 'P-PRUEBA', estado_cuenta: 'abierta', total_preliminar: '42.00', version } } })
  }
  if (ruta === '/pedidos/42/contexto-pago') return route.fulfill({ json: { pedido: { id: '42', codigo_pedido: 'P-PRUEBA', total: '42.00', version, estado_cuenta: pagada ? 'pagada' : version === 1 ? 'abierta' : 'bloqueada_en_pago', bloqueo_propio: version > 1, bloqueo_hasta: new Date(Date.now() + 300000).toISOString() }, sesion_caja: cajaAbierta ? { id: 1, nombre_caja: 'Caja prueba' } : null, finanzas_habilitadas: true, canje: { disponible: false } } })
  if (ruta === '/pedidos/42/bloqueo-pago') { version++; return route.fulfill({ json: { pedido: { id: '42', version } } }) }
  if (ruta === '/pedidos/42/cobro') { cobros++; pagada = true; return route.abort('failed') }
  if (ruta.startsWith('/pedidos/operaciones/pedido.cobrar/')) return route.fulfill({ json: venta })
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
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click()
  // Registrar el borrador no lo limpia. El total del servidor se usa al cobrar.
  await page.getByRole('button', { name: 'Datos y registro del pedido', exact: true }).click()
  await page.getByLabel('Atención', { exact: true }).selectOption('salon')
  await page.getByLabel('Mesa libre', { exact: true }).selectOption('5')
  if (process.argv[3]) {
    await page.getByRole('button', { name: 'Datos y registro del pedido', exact: true }).click()
    await page.setViewportSize({ width: 1366, height: 900 }); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: process.argv[3] + '-laptop.png' })
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: process.argv[3] + '-movil.png' })
    await page.getByRole('button', { name: 'Datos y registro del pedido', exact: true }).click()
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar registro', exact: true }).click()
  await page.getByRole('link', { name: /Continuar con P-PRUEBA/ }).waitFor()
  assert.equal(pedidoRegistrado.tipo_atencion, 'salon'); assert.equal(pedidoRegistrado.mesa_id, 5)
  assert.equal(pedidoRegistrado.lineas[0].cantidad, 2)
  assert.equal(pedidoRegistrado.lineas[0].indicaciones, 'Sin cebolla, poco ají')
  assert.ok(!('total' in pedidoRegistrado) && !('precio' in pedidoRegistrado.lineas[0]))
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9876')).lineas.length), 2)
  await page.getByRole('link', { name: /Continuar con P-PRUEBA/ }).click()
  await page.getByLabel('Caja', { exact: true }).selectOption('1')
  await page.getByLabel('Fondo inicial (S/)', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Confirmar apertura', exact: true }).click()
  await page.getByRole('button', { name: 'Distribuir pago', exact: true }).click()
  await page.getByLabel('Efectivo recibido (S/)', { exact: true }).fill('50')
  await page.getByRole('button', { name: 'Preparar distribución', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar cobro', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar resultado', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Recuperar resultado', exact: true }).click()
  await page.getByRole('region', { name: 'Último cobro confirmado', exact: true }).waitFor()
  assert.equal(cobros, 1)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9876')).lineas.length), 0)
  assert.deepEqual(errores, [])
  console.log('OK: personalización, revisión, móvil, pedido salón con notas, cobro con respuesta perdida, F5, recuperación sin duplicar y limpieza del carrito.')
} finally { await context.close(); await browser.close() }
