import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage(); page.setDefaultTimeout(10000)
const errores = [], posts = [], respuestas = new Map(), sockets = []
page.on('pageerror', e => errores.push(e.message))
let permitido = true, fallar = false, perder = false, demora = 0, consultas = 0
let filas = [
  { id: '1', nombre: 'Caldo de gallina', estado: 'espera', canal: 'cocina', cantidad: 2, indicaciones: 'Presa pecho, sin ají' },
  { id: '2', nombre: 'Pizza Veneziana familiar', estado: 'preparando', canal: 'cocina', cantidad: 1 },
  { id: '3', nombre: 'Pizza americana mediana', estado: 'horno', canal: 'cocina', cantidad: 1 },
  { id: '4', nombre: 'Pan al ajo especial', estado: 'listo_para_entrega', canal: 'cocina', cantidad: 2 },
  { id: '5', nombre: 'Inka Cola 625 ml', estado: 'espera', canal: 'despacho', cantidad: 1 }
].map(t => ({ ...t, version: 1, pedido_item_id: t.id, componente_numero: t.id === '4' ? 2 : 1, variante: null, enviado_en: '2026-11-02T12:30:00Z', iniciado_en: t.estado === 'espera' ? null : '2026-11-02T12:35:00Z', horno_en: t.estado === 'horno' ? '2026-11-02T12:40:00Z' : null, listo_en: null, entregado_en: null, indicaciones: t.indicaciones || '', modificadores: [{ id: 1, nombre: 'Sin aceitunas', grupo_nombre: 'Extras', es_exclusion: true }], pedido: { id: '20', codigo: 'VZ-0020', tipo_atencion: 'salon', estado_cuenta: 'abierta', mesa: { id: 1, codigo: 'M01', zona_id: 1 } } }))
const aviso = uid => JSON.stringify({ protocolo: 1, tipo: 'kds.actualizada', event_uid: uid, tareas: ['1'], canal: 'cocina', version: 2, pedido_id: '20' })
await context.routeWebSocket('**/api/kds/ws', ws => { sockets.push(ws); ws.send(JSON.stringify({ protocolo: 1, tipo: 'kds.conectado', requiere_snapshot: true })); ws.onMessage(() => { throw new Error('El tablero no debe enviar comandos WS') }) })
await context.route('**/api/**', async route => {
  const req = route.request(), url = new URL(req.url()), ruta = url.pathname.replace(/^\/api/, '')
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario: { id: 9987, nombre: 'Cocinero de prueba', rol: { nombre: 'cocinero' }, permisos: permitido ? [{ modulo: 'kds', accion: 'operar' }] : [] } }
  else if (ruta === '/kds/tareas') {
    consultas++
    if (demora) await new Promise(r => setTimeout(r, demora))
    if (fallar) { status = 503; body = { mensaje: 'Fallo temporal de cocina' } }
    else {
      const hasta = url.searchParams.get('hasta') ?? '999', desde = url.searchParams.get('desde') ?? '0'
      const candidatas = filas.filter(t => !['entregado', 'cancelado'].includes(t.estado) && BigInt(t.id) > BigInt(desde) && BigInt(t.id) <= BigInt(hasta))
      const pagina = candidatas.slice(0, 2)
      body = { tareas: structuredClone(pagina), paginacion: { limite: 2, hasta, siguiente: candidatas.length > 2 ? pagina.at(-1).id : null }, servidor_en: new Date().toISOString() }
    }
  } else if (/^\/kds\/tareas\/\d+\/transiciones$/.test(ruta) && req.method() === 'POST') {
    const id = ruta.split('/')[3], datos = req.postDataJSON(), clave = req.headers()['idempotency-key']; posts.push({ id, datos, clave })
    assert.equal(req.headers()['x-csrf-protection'], '1')
    if (respuestas.has(clave)) body = respuestas.get(clave)
    else {
      const t = filas.find(t => t.id === id)
      if (datos.version !== t.version) { status = 409; body = { codigo: 'TAREA_KDS_DESACTUALIZADA', mensaje: 'La preparación cambió en otra pantalla.' } }
      else {
        await new Promise(r => setTimeout(r, 200))
        t.estado = datos.estado; t.version++
        body = { tarea: structuredClone(t), servidor_en: new Date().toISOString(), repetida: false }; respuestas.set(clave, body)
        if (perder) { perder = false; await route.abort(); return }
      }
    }
  } else throw new Error(`Ruta inesperada ${req.method()} ${ruta}`)
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
})
const tarjeta = id => page.locator(`article[aria-label$="tarea ${id}"]`)
const actualizar = () => page.getByRole('button', { name: 'Actualizar tablero', exact: true })
try {
  await page.goto('http://127.0.0.1:5173/cocina')
  await tarjeta('5').waitFor(); assert.equal(await page.locator('.vz-kds-ticket').count(), 5)
  assert.equal(await page.getByRole('link', { name: 'Cocina y despacho', exact: true }).count(), 1)
  await tarjeta('1').getByText('Presa pecho, sin ají', { exact: false }).waitFor()
  await page.getByLabel('Área', { exact: true }).selectOption('despacho'); assert.equal(await page.locator('.vz-kds-ticket').count(), 1)
  await page.getByLabel('Área', { exact: true }).selectOption('todos')
  await page.getByLabel('Buscar preparación').fill('caldo'); assert.equal(await page.locator('.vz-kds-ticket').count(), 1)
  await page.getByLabel('Buscar preparación').fill('')
  // No hay cambios optimistas ni solicitudes de paginación por filtrar.
  await tarjeta('1').getByRole('button', { name: 'Iniciar preparación' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambio' }).click()
  assert.equal(await tarjeta('1').getByText('Estado: En espera', { exact: true }).count(), 1)
  await tarjeta('1').getByRole('button', { name: 'Pasar al horno' }).waitFor()
  assert.equal(posts.length, 1)
  // Respuesta perdida: se conserva la identidad tras F5 y reintenta exactamente.
  perder = true
  await tarjeta('5').getByRole('button', { name: 'Confirmar entrega' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambio' }).click()
  await page.getByRole('button', { name: 'Reintentar operación' }).waitFor()
  const perdido = posts.at(-1)
  await page.reload(); await page.getByRole('button', { name: 'Reintentar operación' }).click()
  await page.getByRole('button', { name: 'Reintentar operación' }).waitFor({ state: 'hidden' })
  assert.deepEqual(posts.at(-1), perdido); assert.equal(await tarjeta('5').count(), 0)
  // Cancelación tardía muestra requisito de aprobación y conserva destino.
  await tarjeta('1').getByRole('button', { name: 'Cancelar tarea' }).click()
  await page.getByLabel('ID de autorización', { exact: true }).waitFor()
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0)
  // Aviso duplicado se deduplica; el estado viene de una consulta nueva.
  filas[0].estado = 'horno'; filas[0].version++
  sockets.at(-1).send(aviso('evento_f37_1')); sockets.at(-1).send(aviso('evento_f37_1'))
  await tarjeta('1').getByRole('button', { name: 'Marcar listo' }).waitFor()
  // Reconexion reemplaza snapshot y quita una tarea finalizada sin replay.
  filas[3].estado = 'entregado'; filas[3].version++
  sockets.at(-1).close({ code: 1012, reason: 'Prueba de reconexión' })
  await tarjeta('4').waitFor({ state: 'hidden' })
  await page.getByRole('status').filter({ hasText: 'En vivo' }).waitFor()
  demora = 300; await actualizar().click(); assert.equal(await tarjeta('1').count(), 1)
  await page.getByLabel('Buscar preparación').fill('caldo'); assert.equal(await tarjeta('1').count(), 1)
  await page.getByLabel('Buscar preparación').fill(''); demora = 0
  await page.getByRole('status').filter({ hasText: 'En vivo' }).waitFor()
  for (const width of [320, 390, 768, 1366, 1920]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(t => { document.documentElement.dataset.tema = t; scrollTo(0, 0) }, tema)
    await page.getByLabel('Etapa', { exact: true }).selectOption('horno')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${tema}`)
    await page.getByLabel('Etapa', { exact: true }).selectOption('todas')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow todas ${width}/${tema}`)
    if (process.argv[3] && [390, 1366].includes(width)) await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
  }
  fallar = true; await actualizar().click(); await page.getByRole('alert').filter({ hasText: 'Fallo temporal' }).waitFor()
  assert.equal(await tarjeta('1').count(), 1); assert.ok(await tarjeta('1').getByRole('button').first().isDisabled())
  assert.equal(new URL(page.url()).pathname, '/cocina')
  fallar = false; await actualizar().click(); await tarjeta('1').getByRole('button').first().waitFor()
  permitido = false; await page.reload()
  await page.getByRole('heading', { name: 'No tienes acceso a esta sección' }).waitFor()
  // Esperar al destino protegido: una consulta anterior ya en vuelo puede
  // terminar durante la navegación, pero la página denegada no debe consultar.
  const antes = consultas; await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForTimeout(100); assert.equal(consultas, antes)
  assert.deepEqual(errores, [])
  console.log('OK F37 navegador: páginas, permisos, controles confirmados, notas, filtros, reintento con F5, eventos/reconexión, error sin logout, 320/390/768/1366/1920 claro y oscuro sin overflow.')
} finally { await browser.close() }
