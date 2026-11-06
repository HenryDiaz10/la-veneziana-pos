import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { reporteFixture } from './reportes-fixture.mjs'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true })
const page = await context.newPage(); page.setDefaultTimeout(10000)
let permitido = true, fallar = false, corrupto = false, vacio = false, incompleto = false, demora = 0, consultas = 0
const errores = [], escrituras = [], pedidosGastos = []
page.on('pageerror', e => errores.push(e.message))
await context.route('**/api/**', async route => {
  const req = route.request(), url = new URL(req.url()), ruta = url.pathname.replace(/^\/api/, '')
  if (req.method() !== 'GET') escrituras.push(ruta)
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario: { id: 9987, nombre: 'Gerente de prueba', rol: { nombre: 'lector' }, permisos: permitido ? [{ modulo: 'reportes', accion: 'leer' }] : [] } }
  else if (ruta === '/reportes/gerencial') {
    consultas++; const q = Object.fromEntries(url.searchParams)
    if (demora) await new Promise(r => setTimeout(r, demora))
    if (fallar) { status = 503; body = { mensaje: 'Fallo temporal del reporte' } }
    else {
      body = reporteFixture(); body.filtros = { ...body.filtros, ...q, sesion_id: q.sesion_id ? Number(q.sesion_id) : null }
      body.serie_ventas = q.desde === q.hasta ? [{ fecha: q.desde, cantidad: 5, total: '100.00' }] : [{ fecha: q.desde, cantidad: 2, total: '40.00' }, { fecha: q.hasta, cantidad: 3, total: '60.00' }]
      if (incompleto || q.estado !== 'emitida') body.estimacion = { completa: false, advertencias: [incompleto ? 'reservas_pendientes' : 'seleccion_incluye_estados_no_emitidos'], margen_base_menos_costo: null, resultado_tras_gastos: null }
      if (vacio) {
        body.ventas = { cantidad: 0, total: '0.00', base_registrada: '0.00', impuesto_registrado: '0.00', ticket_promedio: '0.00' }; body.serie_ventas = []
        body.medios = body.medios.map(m => ({ ...m, cobrado: '0.00', devuelto: '0.00', neto: '0.00' }))
      }
      if (corrupto) body.ventas.total = null
    }
  } else if (ruta === '/reportes/gastos/categorias') body = { categorias: [{ id: 2, nombre: 'Servicios', es_deducible_impuestos: false }] }
  else if (ruta === '/reportes/gastos') {
    assert.ok(!url.searchParams.has('estado')); pedidosGastos.push(url.searchParams.toString())
    const despues = url.searchParams.get('despues'), id = despues ? 12 : 11
    body = { gastos: vacio ? [] : [{ id, descripcion: `Gasto de demostración ${id}`, monto_gasto: '14.00', fecha_gasto: '2026-11-06', clasificacion: 'operativo', categoria_id: 2, movimiento_caja_id: null }], filtros: {}, paginacion: { siguiente: !vacio && !despues ? 11 : null } }
  } else throw new Error(`API inesperada ${ruta}`)
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
})
const actualizar = () => page.getByRole('button', { name: 'Actualizar reporte', exact: true })
const exportar = () => page.getByRole('button', { name: 'Exportar reporte CSV', exact: true })
try {
  await page.goto('http://localhost:5173/reportes')
  await page.getByRole('heading', { name: 'Reportes gerenciales', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Cobros por medio', exact: true }).waitFor()
  await page.getByText('Gasto de demostración 11', { exact: true }).waitFor()
  assert.equal(await page.locator('canvas').count(), 2)
  assert.equal(await page.getByRole('link', { name: 'Reportes gerenciales', exact: true }).count(), 1)
  assert.ok(await page.getByRole('table', { name: 'Importes por medio de pago en soles' }).getByText('−S/ 5.00', { exact: true }).count())
  const previas = consultas
  await page.getByLabel('Desde', { exact: true }).fill('2026-11-01')
  await page.getByLabel('Hasta', { exact: true }).fill('2026-11-06')
  await page.getByLabel('Sesión de caja (ID)', { exact: true }).fill('42')
  assert.equal(consultas, previas)
  demora = 400; await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
  assert.equal(await page.locator('canvas').count(), 2); assert.ok(await exportar().isDisabled())
  await page.getByText(/Estado: emitida · Sesión: 42/).waitFor(); demora = 0
  await page.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('Exportar'))
  const pngPendiente = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PNG de medios', exact: true }).click()
  const png = await pngPendiente, stream = await png.createReadStream(), trozos = []
  for await (const trozo of stream) trozos.push(trozo)
  const buffer = Buffer.concat(trozos); assert.equal(buffer.subarray(1, 4).toString(), 'PNG'); assert.ok(buffer.length > 1000)
  if (process.argv[3]) await png.saveAs(`${process.argv[3]}-medios.png`)
  const csvPendiente = page.waitForEvent('download'); await exportar().click()
  const csv = await csvPendiente, csvStream = await csv.createReadStream(), textos = []
  for await (const trozo of csvStream) textos.push(trozo)
  const contenido = Buffer.concat(textos).toString('utf8'); assert.ok(contenido.includes('"sesion_id";"42"')); assert.ok(contenido.includes('"100.00"')); assert.ok(contenido.includes('"America/Lima"'))
  // Paginación de gastos mantiene el resto del reporte y no consulta sus métricas.
  const antesGastos = consultas
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click(); await page.getByText('Gasto de demostración 12', { exact: true }).waitFor()
  assert.equal(consultas, antesGastos); await page.getByRole('button', { name: 'Anterior', exact: true }).click(); await page.getByText('Gasto de demostración 11', { exact: true }).waitFor()
  await page.getByLabel('Sesión de caja (ID)', { exact: true }).fill('-1'); await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'entero positivo' }).waitFor(); assert.equal(consultas, antesGastos)
  await page.getByLabel('Sesión de caja (ID)', { exact: true }).fill('42')
  incompleto = true; await actualizar().click(); await page.getByRole('heading', { name: 'Estimación incompleta', exact: true }).waitFor()
  assert.equal(await page.getByText('No disponible', { exact: true }).count(), 2)
  incompleto = false; await actualizar().click(); await page.getByText('S/ 66.0000', { exact: true }).waitFor()
  for (const width of [320, 390, 768, 1366, 1920]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 1000 })
    const actual = await page.evaluate(() => document.documentElement.dataset.tema)
    if (actual !== tema) await page.getByRole('button', { name: `Activar modo ${tema}`, exact: true }).click()
    await page.getByText('S/ 66.0000', { exact: true }).waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${tema}`)
    const medidas = await page.locator('canvas').evaluateAll(xs => xs.map(x => ({ ancho: x.width, alto: x.height })))
    assert.ok(medidas.every(m => m.ancho > 0 && m.alto > 0))
    if (process.argv[3] && [390, 1366].includes(width)) await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
  }
  fallar = true; await actualizar().click(); await page.getByRole('alert').filter({ hasText: 'Fallo temporal' }).waitFor(); assert.equal(new URL(page.url()).pathname, '/reportes')
  fallar = false; await page.getByRole('button', { name: 'Reintentar reporte', exact: true }).click(); await page.getByText('S/ 66.0000', { exact: true }).waitFor()
  corrupto = true; await actualizar().click(); await page.getByRole('alert').waitFor(); assert.equal(await page.locator('canvas').count(), 0)
  corrupto = false; vacio = true; await page.getByRole('button', { name: 'Reintentar reporte', exact: true }).click()
  await page.getByText('No hay cobros para dibujar con estos filtros.', { exact: true }).waitFor(); assert.equal(await page.locator('canvas').count(), 0)
  permitido = false; await page.reload(); await page.getByRole('heading', { name: 'No tienes acceso a esta sección' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Reportes gerenciales', exact: true }).count(), 0)
  assert.deepEqual(errores, []); assert.deepEqual(escrituras, [])
  console.log('OK F40: acceso lector, filtros aplicados, gráficos reales y tablas, importes negativos/exactos, gastos paginados, incompleto/vacío/error, descargas PNG/CSV, cinco tamaños claro/oscuro y reduced-motion. Sin escrituras API.')
} finally { await browser.close() }
