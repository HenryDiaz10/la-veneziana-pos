import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errores = [], escrituras = []
page.on('pageerror', e => errores.push(e.message))
let permitido = true, fallar = false, demorar = false, sinZonas = false, corrupto = false, consultas = 0
const mesas = ['libre', 'ocupada', 'sucia_por_limpiar', 'inhabilitada'].map((estado, i) => ({ id: i + 1, zona_id: 1, codigo_mesa: `M0${i + 1}`, capacidad_sillas: i + 2, estado_actual: estado, mesero_asignado_id: i === 1 ? 9876 : null, posicion_x: i % 2 * 200, posicion_y: Math.floor(i / 2) * 200 }))
const datos = () => ({ consultado_en: '2026-10-23T18:00:00Z', zonas: sinZonas ? [] : [{ id: 1, nombre: 'Salón principal', aforo_maximo: 32 }, { id: 2, nombre: 'Terraza', aforo_maximo: 12 }, { id: 3, nombre: 'Segundo piso', aforo_maximo: 0 }],
  mesas: sinZonas ? [] : [...structuredClone(mesas), ...[5, 6].map(id => ({ id, zona_id: 2, codigo_mesa: `T0${id}`, capacidad_sillas: null, estado_actual: id === 5 ? 'libre' : null, mesero_asignado_id: null, posicion_x: 0, posicion_y: 0 }))] })
await context.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  if (req.method() !== 'GET') escrituras.push(ruta)
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario: { id: 9876, nombre: 'Mesero de prueba', rol: { nombre: 'mesero' }, permisos: permitido ? [{ modulo: 'mesas', accion: 'gestionar' }, { modulo: 'pedidos', accion: 'crear' }] : [] } }
  else if (ruta === '/salon') {
    consultas++
    if (demorar) await new Promise(r => setTimeout(r, 350))
    if (fallar) { status = 503; body = { mensaje: 'Fallo temporal del salón' } }
    else { body = datos(); if (corrupto) body.mesas[0].estado_actual = 'desconocida' }
  } else throw new Error(`API inesperada: ${ruta}`)
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
})
const tarjetas = () => page.getByRole('button', { name: /^Mesa / })
const actualizar = () => page.getByRole('button', { name: 'Actualizar mesas', exact: true })
try {
  await page.goto('http://localhost:5173/salon')
  await page.getByRole('heading', { name: 'Mapa de mesas', exact: true }).waitFor()
  await tarjetas().first().waitFor()
  assert.equal(await tarjetas().count(), 4)
  assert.equal(await page.getByRole('link', { name: 'Salón y mesas', exact: true }).count(), 1)
  await page.locator('.vz-floor-map').waitFor()
  const buscar = page.getByLabel('Buscar mesa', { exact: true })
  await buscar.fill('m02'); assert.equal(await tarjetas().count(), 1)
  await tarjetas().click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('heading', { name: 'Mesa M02', exact: true }).waitFor()
  await dialogo.getByText('Empleado #9876 (tú)', { exact: true }).waitFor()
  await dialogo.getByText('200, 0', { exact: true }).waitFor()
  await page.keyboard.press('Escape'); assert.equal(await dialogo.count(), 0)
  await buscar.fill(''); await page.getByLabel('Solo mis mesas', { exact: true }).check()
  assert.equal(await tarjetas().count(), 1)
  await page.getByLabel('Estado', { exact: true }).selectOption('libre')
  await page.getByText('No hay mesas que coincidan con los filtros.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  const inicial = consultas
  await buscar.fill('M01'); demorar = true
  await buscar.evaluate(el => { el.dataset.prueba = 'conservar' })
  await actualizar().click()
  assert.equal(await tarjetas().count(), 1)
  assert.equal(await buscar.getAttribute('data-prueba'), 'conservar')
  await actualizar().waitFor(); demorar = false
  assert.equal(await buscar.inputValue(), 'M01'); assert.equal(consultas, inicial + 1)
  mesas[0].estado_actual = 'ocupada'
  await actualizar().click(); await page.getByRole('button', { name: /^Mesa M01, Ocupada/ }).waitFor()
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await page.getByRole('button', { name: /Terraza/ }).click()
  await page.getByText(/^Vista en cuadrícula:/).waitFor()
  assert.equal(await tarjetas().count(), 2)
  await page.getByRole('button', { name: /^Mesa T06/ }).click()
  await dialogo.getByText('Sin estado registrado', { exact: true }).waitFor()
  await dialogo.getByText('Sin registrar', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Segundo piso/ }).click()
  await page.getByText('Esta zona todavía no tiene mesas registradas.', { exact: true }).waitFor()
  await page.getByRole('button', { name: /Salón principal/ }).click()
  const n = consultas
  for (const width of [320, 390, 768, 1366]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(t => { document.documentElement.dataset.tema = t; scrollTo(0, 0) }, tema)
    await page.getByRole('button', { name: 'Lista', exact: true }).click()
    await page.getByRole('button', { name: 'Mapa', exact: true }).click()
    assert.equal(await tarjetas().count(), 4)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${tema}`)
    const cajas = await tarjetas().evaluateAll(nodos => nodos.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }))
    for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i], b = cajas[j]; assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `Superposición ${width}`)
    }
    await tarjetas().first().focus(); await page.keyboard.press('Enter')
    await dialogo.waitFor(); assert.ok(await dialogo.evaluate(el => el.contains(document.activeElement)))
    await page.keyboard.press('Escape')
    if (process.argv[3] && [390, 1366].includes(width)) await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
  }
  assert.equal(consultas, n, 'Filtrar, cambiar vista y consultar detalle no generan peticiones ni escrituras')
  fallar = true; await actualizar().click()
  await page.getByRole('alert').getByText('Fallo temporal del salón', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/salon')
  fallar = false; await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click()
  await tarjetas().first().waitFor()
  corrupto = true; await actualizar().click()
  await page.getByRole('alert').waitFor(); assert.equal(await tarjetas().count(), 0)
  corrupto = false; sinZonas = true
  await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click()
  await page.getByRole('heading', { name: 'Todavía no hay zonas registradas', exact: true }).waitFor()
  permitido = false; const previas = consultas
  await page.reload()
  await page.getByRole('heading', { name: 'No tienes acceso a esta sección', exact: true }).waitFor()
  assert.equal(consultas, previas); assert.deepEqual(escrituras, []); assert.deepEqual(errores, [])
  console.log('OK fase 33: mapa real, zonas, filtros locales, asignación, estados/null, vacío, actualización sin parpadeo, API inválida/error sin logout, permisos, teclado y 320-1366px sin superposiciones ni escrituras.')
} finally { await context.close(); await browser.close() }
