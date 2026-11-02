import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage(); page.setDefaultTimeout(10000)
await page.clock.install({ time: new Date('2026-11-02T18:00:00Z') })
await context.addInitScript(() => {
  const Contexto = window.AudioContext
  window.__audio = { contextos: 0, tonos: 0 }
  window.AudioContext = class extends Contexto {
    constructor(...args) { super(...args); window.__audio.contextos++ }
    get state() { return sessionStorage.getItem('probar-bloqueo-audio') ? 'suspended' : super.state }
    async resume() { if (sessionStorage.getItem('probar-bloqueo-audio')) throw new Error('Prueba de bloqueo de audio'); return super.resume() }
    createOscillator() { window.__audio.tonos++; const voz = super.createOscillator(); voz.addEventListener('ended', () => { window.__terminados = (window.__terminados || 0) + 1 }); return voz }
  }
})
const errores = [], sockets = [], posts = []
page.on('pageerror', e => errores.push(e.message))
let fallar = false, n = 0
const baseHora = Date.parse('2026-11-02T18:00:00Z')
const tarea = (id, estado = 'espera') => ({ id, pedido_item_id: id, componente_numero: 1, version: 1, estado, canal: 'cocina', cantidad: 2, nombre: id === '1' ? 'Caldo de gallina' : `Pizza Veneziana ${id}`, variante: 'Familiar', modificadores: [{ id: 1, nombre: 'Sin ají', grupo_nombre: 'Preparación', es_exclusion: true }], indicaciones: 'Presa pecho, bien caliente', enviado_en: new Date(baseHora - 30 * 60000).toISOString(), iniciado_en: new Date(baseHora - 20 * 60000).toISOString(), horno_en: new Date(baseHora - 60000).toISOString(), listo_en: null, entregado_en: null, pedido: { id: '20', codigo: 'VZ-0020', tipo_atencion: 'salon', estado_cuenta: 'abierta', mesa: { id: 1, codigo: 'M01', zona_id: 1 } } })
const filas = [tarea('1'), tarea('2', 'horno'), tarea('3', 'preparando')]
await context.routeWebSocket('**/api/kds/ws', ws => { sockets.push(ws); ws.send(JSON.stringify({ protocolo: 1, tipo: 'kds.conectado' })) })
await context.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  if (req.method() !== 'GET') posts.push(ruta)
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario: { id: 9987, nombre: 'Cocinero de prueba', rol: { nombre: 'cocinero' }, permisos: [{ modulo: 'kds', accion: 'operar' }] } }
  else if (ruta === '/kds/tareas') {
    if (fallar) { status = 503; body = { mensaje: 'Fallo temporal de cocina' } }
    else body = { tareas: structuredClone(filas), paginacion: { hasta: '999', siguiente: null }, servidor_en: new Date(baseHora + await page.evaluate(() => performance.now())).toISOString() }
  } else throw new Error(`Ruta inesperada ${ruta}`)
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
})
const tarjeta = id => page.locator(`article[aria-label$="tarea ${id}"]`)
const tonos = () => page.evaluate(() => window.__audio.tonos)
const nuevo = async id => {
  filas.push(tarea(id))
  const mensaje = JSON.stringify({ protocolo: 1, tipo: 'pedido.cocina', event_uid: `aviso_${++n}`, pedido_id: '20', tareas: [id], canal: 'cocina', version: 1 })
  sockets.at(-1).send(mensaje); await tarjeta(id).waitFor(); return mensaje
}
try {
  await page.goto('http://127.0.0.1:5173/cocina'); await tarjeta('3').waitFor()
  assert.deepEqual(await page.evaluate(() => window.__audio), { contextos: 0, tonos: 0 })
  assert.match(await tarjeta('2').locator('.vz-kds-tiempos').innerText(), /Tiempo en horno\s+01:0/)
  assert.equal(await tarjeta('2').locator('.es-recordatorio').count(), 0)
  await tarjeta('3').getByText(/Revisar preparación/).waitFor()
  const inicioTexto = await tarjeta('2').locator('.vz-kds-tiempos strong').first().innerText()
  await page.clock.setSystemTime(new Date('2040-01-01T00:00:00Z'))
  await page.clock.runFor(1500)
  assert.match(await tarjeta('2').locator('.vz-kds-tiempos strong').first().innerText(), /^01:0/)
  await page.waitForFunction(inicial => document.querySelector('article[aria-label$="tarea 2"] .vz-kds-tiempos strong')?.textContent !== inicial, inicioTexto)
  await page.getByRole('button', { name: 'Activar y probar sonido', exact: true }).click()
  await page.getByRole('button', { name: 'Probar sonido', exact: true }).waitFor()
  assert.equal(await tonos(), 1); await page.waitForFunction(() => window.__terminados >= 1)
  const mensaje = await nuevo('4'); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 2)
  sockets.at(-1).send(mensaje); await page.getByRole('button', { name: 'Actualizar tablero' }).click(); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 2)
  await page.getByRole('button', { name: 'Silenciar 5 minutos' }).click()
  await nuevo('5'); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 2)
  await page.getByText(/Último aviso · 1 preparación nueva · aviso 2/).waitFor()
  // Vencimiento del silencio con reloj simulado, sin esperar cinco minutos reales.
  await page.clock.fastForward(301000)
  await page.getByRole('button', { name: 'Silenciar 5 minutos', exact: true }).waitFor()
  assert.equal(await tonos(), 2)
  await nuevo('6'); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 3)
  await page.getByLabel('Volumen de avisos').fill('0')
  await nuevo('7'); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 3)
  await page.getByLabel('Volumen de avisos').fill('50')
  await nuevo('8'); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 4)
  // La conexión se recupera con una tarea nueva ya existente: no alarma historial.
  filas.push(tarea('9')); sockets.at(-1).close({ code: 1012, reason: 'Prueba reconexión' })
  await tarjeta('9').waitFor(); await page.clock.runFor(1200); await new Promise(r => setTimeout(r, 400)); assert.equal(await tonos(), 4)
  await page.getByLabel('Recordatorio: En horno', { exact: true }).fill('1')
  await tarjeta('2').getByText(/Revisar preparación/).waitFor(); assert.equal(await tonos(), 4)
  for (const width of [320, 390, 768, 1366, 1920]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => { document.documentElement.dataset.tema = t }, tema)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${width}/${tema}`)
    assert.equal(await tarjeta('2').locator('.vz-kds-tiempos').evaluate(e => getComputedStyle(e).animationName), 'none')
    if (process.argv[3] && [390, 1366].includes(width)) {
      await page.getByLabel('Etapa', { exact: true }).selectOption('horno')
      await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
      await page.getByLabel('Etapa', { exact: true }).selectOption('todas')
    }
  }
  fallar = true; await page.getByRole('button', { name: 'Actualizar tablero' }).click()
  await page.getByText(/Sin actualización confirmada: los tiempos/).waitFor(); assert.equal(new URL(page.url()).pathname, '/cocina')
  fallar = false; await page.reload(); await tarjeta('9').waitFor()
  assert.equal(await page.getByLabel('Volumen de avisos').inputValue(), '50')
  assert.equal(await page.getByLabel('Recordatorio: En horno', { exact: true }).inputValue(), '1')
  assert.deepEqual(await page.evaluate(() => window.__audio), { contextos: 0, tonos: 0 })
  await page.evaluate(() => sessionStorage.setItem('probar-bloqueo-audio', '1')); await page.reload(); await tarjeta('1').waitFor()
  await page.getByRole('button', { name: 'Activar y probar sonido', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Prueba de bloqueo de audio' }).waitFor(); assert.equal(await tonos(), 0)
  assert.equal(await tarjeta('1').count(), 1); assert.deepEqual(posts, []); assert.deepEqual(errores, [])
  console.log('OK F38: Web Audio real solo por gesto, avisos deduplicados, silencio/vencimiento/volumen, reconexión sin historial, reloj servidor/horno independiente del reloj Windows, preferencias/F5, bloqueo audio, reduced-motion y cinco tamaños en ambos temas. Sin escrituras API.')
} finally { await browser.close() }
