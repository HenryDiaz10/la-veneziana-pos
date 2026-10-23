import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
await context.addInitScript(() => {
  const clave = 'la-veneziana-carrito-v1:9876'
  if (!localStorage.getItem(clave)) localStorage.setItem(clave, JSON.stringify({ version: 1, lineas: [{ id: '00000000-0000-4000-8000-000000000001', productoId: 1, varianteId: null, modificadoresIds: [], cantidad: 1, indicaciones: 'Pecho' }] }))
})
page.setDefaultTimeout(10000)
const errores = [], escrituras = []
page.on('pageerror', e => errores.push(e.message))
let abierta = true, nueva = false, autorizado = true, fallar = false, demorar = false, obsoleta = true, revision = 'a'.repeat(64), copias = 0, cierre, ingresos = 20, egresos = 15
const movimientos = [{ id: 1, tipo: 'ingreso', monto: '20.00', concepto: 'Fondo para cambio', fecha: '2026-10-23T14:00:00Z' }, { id: 2, tipo: 'egreso', monto: '15.00', concepto: 'Gasto autorizado', fecha: '2026-10-23T14:30:00Z' }]
const usuario = () => ({ id: 9876, nombre: 'Prueba arqueo', rol: { nombre: 'administrador' }, permisos: autorizado ? [{ modulo: 'caja', accion: 'gestionar' }, { modulo: 'seguridad', accion: 'gestionar' }] : [] })
function snapshot(id = 7) {
  const medios = { efectivo: '60.00', yape: '40.00', plin: '0.00', tarjeta_debito: '0.00', tarjeta_credito: '0.00', transferencia: '0.00', puntos_vip: '0.00', cortesia: '0.00' }
  const dev = { ...medios, efectivo: '6.00', yape: '4.00' }
  if (id === 8) { for (const k of Object.keys(medios)) { medios[k] = '0.00'; dev[k] = '0.00' } }
  return { version_algoritmo: 1, sesion: { id, caja_fisica_id: 1, cajero_id: 9876, apertura_fecha: '2026-10-23T13:00:00Z', apertura_monto_base: id === 8 ? '0.00' : '100.00' },
    totales: { apertura: id === 8 ? '0.00' : '100.00', cobrado_por_metodo: medios, devuelto_por_metodo: dev, neto_por_metodo: { ...medios, efectivo: id === 8 ? '0.00' : '54.00', yape: id === 8 ? '0.00' : '36.00' }, ingresos: id === 8 ? '0.00' : ingresos.toFixed(2), egresos: id === 8 ? '0.00' : egresos.toFixed(2), teorico_efectivo: id === 8 ? '0.00' : (154 + ingresos - egresos).toFixed(2) },
    movimientos: id === 8 ? [] : [...movimientos], ventas: id === 8 ? [] : [{ id: '42', pedido_id: '31', codigo: 'T-PRUEBA', total: '100.00' }], pagos: id === 8 ? [] : [{ id: '1' }], devoluciones: id === 8 ? [] : [{ id: '1', devolucion_id: '1', metodo_pago: 'efectivo', monto: '6.00' }] }
}
await context.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  let body, status = 200
  if (req.method() === 'POST') escrituras.push({ ruta, key: req.headers()['idempotency-key'], body: req.postDataJSON() })
  if (ruta === '/auth/session') body = { usuario: usuario() }
  else if (ruta === '/caja/sesion') body = { cajas: [{ id: 1, nombre_terminal: 'Caja prueba' }], sesion: nueva || abierta ? { id: nueva ? 8 : 7, apertura_monto_base: nueva ? '0.00' : '100.00' } : null }
  else if (/^\/caja\/sesiones\/(7|8)\/resumen$/.test(ruta)) {
    if (demorar) await new Promise(r => setTimeout(r, 250))
    if (fallar) { status = 503; body = { mensaje: 'Consulta interrumpida de prueba' } }
    else body = { estado: ruta.includes('/8/') || abierta ? 'abierta' : 'cerrada', revision, resumen: ruta.includes('/8/') ? snapshot(8) : cierre?.cierre.snapshot ?? snapshot(), impresion: cierre?.cierre.impresion ?? null }
  } else if (ruta === '/caja/sesiones/7/movimientos') {
    const b = req.postDataJSON(); assert.ok(b.monto && b.concepto && !('saldo' in b))
    if (b.tipo === 'egreso') { assert.equal(b.autorizacion_id, '123'); egresos += Number(b.monto) } else ingresos += Number(b.monto)
    movimientos.push({ id: movimientos.length + 1, tipo: b.tipo, monto: b.monto, concepto: b.concepto, fecha: '2026-10-23T16:00:00Z' })
    body = { movimiento: { id: movimientos.length, sesion_id: 7 } }
  } else if (ruta === '/autorizaciones') body = { autorizacion: { id: '123' } }
  else if (ruta === '/caja/sesiones/7/cierre') {
    const b = req.postDataJSON(); assert.deepEqual(Object.keys(b).sort(), ['cierre_real_efectivo', 'observaciones', 'revision'])
    if (obsoleta) { obsoleta = false; revision = 'b'.repeat(64); status = 409; body = { codigo: 'CAJA_DESACTUALIZADA', mensaje: 'La caja cambió. Revisa el conteo otra vez.' } }
    else {
      assert.equal(b.revision, revision); abierta = false
      const r = snapshot(); r.corte_utc = '2026-10-23T18:00:00Z'; r.cierre = { contado: b.cierre_real_efectivo, descuadre: (Number(b.cierre_real_efectivo) - Number(r.totales.teorico_efectivo)).toFixed(2), observaciones: b.observaciones }
      cierre = { cierre: { sesion_id: 7, estado: 'cerrada', snapshot: r, impresion: { job_uid: 'cierre_prueba_123', estado: 'pendiente', numero_copia: 0 } } }
      return route.abort('failed') // Commit confirmado; se pierde solo la respuesta.
    }
  } else if (ruta.startsWith('/caja/operaciones/caja.cerrar/')) body = cierre
  else if (ruta === '/caja/sesiones/7/copias') body = { copia: { sesion_id: 7, impresion: { job_uid: 'copia_prueba_123', estado: 'pendiente', numero_copia: ++copias } } }
  else if (ruta.startsWith('/caja/impresion/')) body = { trabajo: { estado: 'enviado' } }
  else if (ruta === '/caja/sesiones') { assert.equal(req.postDataJSON().apertura_monto_base, '0.00'); nueva = true; body = { sesion: { id: 8 } } }
  else throw new Error(`Ruta inesperada ${req.method()} ${ruta}`)
  await route.fulfill({ status, json: body })
})
try {
  await page.goto('http://localhost:5173/caja')
  const contado = page.getByLabel('Efectivo contado (S/)', { exact: true })
  await contado.fill('158,50')
  await page.getByLabel('Observaciones del conteo', { exact: true }).fill('OBSERVACION-PRIVADA-32')
  const elemento = await contado.elementHandle()
  demorar = true
  await page.getByRole('button', { name: 'Actualizar resumen', exact: true }).click()
  await page.getByRole('button', { name: 'Revisar cierre', exact: true }).waitFor()
  await page.waitForFunction(() => !document.querySelector('fieldset[disabled]'))
  assert.ok(await elemento.evaluate(e => e.isConnected)); assert.equal(await contado.inputValue(), '158,50')
  fallar = true; demorar = false
  await page.getByRole('button', { name: 'Actualizar resumen', exact: true }).click()
  await page.getByText('Consulta interrumpida de prueba', { exact: true }).waitFor()
  fallar = false
  await page.getByRole('button', { name: 'Reintentar resumen', exact: true }).click()
  await contado.waitFor(); assert.equal(await contado.inputValue(), '158,50')
  await page.getByRole('button', { name: 'Por denominaciones', exact: true }).click()
  for (const [nombre, cantidad] of [['100', '1'], ['20', '2'], ['5', '3'], ['1', '3'], ['0.20', '2'], ['0.10', '1']]) await page.getByLabel(`Cantidad de S/ ${nombre}`, { exact: true }).fill(cantidad)
  for (const width of [1366, 768, 390, 320]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(t => { document.documentElement.dataset.tema = t }, tema)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${tema}`)
    if (process.argv[3] && (width === 1366 || width === 390)) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${process.argv[3]}-${width}-${tema}.png`, fullPage: true, animations: 'disabled' }) }
    await page.getByRole('button', { name: 'Revisar cierre', exact: true }).click()
    const modal = page.getByRole('dialog')
    assert.ok(await modal.getByRole('button', { name: 'Confirmar cierre de caja', exact: true }).isDisabled())
    assert.ok(await modal.evaluate(e => e.scrollWidth <= e.clientWidth + 1))
    await page.keyboard.press('Tab'); assert.ok(await modal.evaluate(e => e.contains(document.activeElement)))
    await modal.getByRole('button', { name: 'Volver al conteo', exact: true }).click()
  }
  assert.equal(escrituras.filter(e => e.ruta.endsWith('/cierre')).length, 0)
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Monto del movimiento (S/)', { exact: true }).fill('5')
  await dialog.getByLabel('Concepto', { exact: true }).fill('Cambio pequeño')
  await dialog.getByRole('button', { name: 'Confirmar movimiento', exact: true }).click()
  await page.getByText('Cambio pequeño', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tipo de movimiento', { exact: true }).selectOption('egreso')
  await dialog.getByLabel('Monto del movimiento (S/)', { exact: true }).fill('1')
  await dialog.getByLabel('Concepto', { exact: true }).fill('Gasto de prueba')
  await dialog.getByRole('button', { name: 'Autorizar este egreso', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('input[maxlength="19"]')?.value === '123')
  await dialog.getByLabel('Monto del movimiento (S/)', { exact: true }).fill('2')
  assert.equal(await dialog.getByLabel('ID de autorización', { exact: true }).inputValue(), '')
  await dialog.getByLabel('Monto del movimiento (S/)', { exact: true }).fill('1')
  await dialog.getByRole('button', { name: 'Autorizar este egreso', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('input[maxlength="19"]')?.value === '123')
  await dialog.getByRole('button', { name: 'Confirmar movimiento', exact: true }).click()
  await page.getByText('Gasto de prueba', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('Cantidad de S/ 100', { exact: true }).inputValue(), '1')
  async function confirmar() {
    await page.getByRole('button', { name: 'Revisar cierre', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Revisé el conteo y confirmo el cierre de este turno.', { exact: true }).check()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cierre de caja', exact: true }).click()
  }
  await confirmar()
  await page.getByText('La caja cambió. Revisa el conteo otra vez.', { exact: true }).waitFor()
  await confirmar()
  await page.getByRole('button', { name: 'Recuperar resultado', exact: true }).waitFor()
  const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  assert.ok(!guardado.includes('158.50') && !guardado.includes('OBSERVACION-PRIVADA-32'))
  await page.reload()
  await page.getByRole('button', { name: 'Recuperar resultado', exact: true }).click()
  const resultado = page.getByRole('region', { name: 'Resultado confirmado del cierre', exact: true })
  await resultado.getByText('S/ -4.50', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9876')).lineas.length), 1)
  assert.equal(escrituras.filter(e => e.ruta.endsWith('/cierre')).length, 2)
  assert.equal(await page.getByRole('button', { name: 'Revisar cierre', exact: true }).count(), 0)
  if (process.argv[3]) for (const width of [1366, 390]) for (const tema of ['claro', 'oscuro']) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(t => { document.documentElement.dataset.tema = t; scrollTo(0, 0) }, tema)
    await page.screenshot({ path: `${process.argv[3]}-cierre-${width}-${tema}.png`, fullPage: true, animations: 'disabled' })
  }
  await page.getByRole('button', { name: 'Preparar copia del cierre', exact: true }).click()
  await page.getByText('Copia 1 preparada para el agente de impresión.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Consultar impresión', exact: true }).click()
  await page.getByText('Formato simulado por el agente; sin impresión física confirmada.', { exact: true }).waitFor()
  await page.getByLabel('Caja', { exact: true }).selectOption('1')
  await page.getByLabel('Fondo inicial (S/)', { exact: true }).fill('0')
  await page.getByRole('button', { name: 'Confirmar apertura', exact: true }).click()
  await contado.waitFor(); assert.equal(await contado.inputValue(), '')
  assert.equal(await page.getByLabel('Observaciones del conteo', { exact: true }).inputValue(), '')
  autorizado = false
  await page.goto('http://localhost:5173/caja')
  await page.getByRole('heading', { name: 'No tienes acceso a esta sección', exact: true }).waitFor()
  assert.deepEqual(errores, [])
  console.log('OK fase 32: conteo directo/denominaciones, actualización sin desmontar, error sin perder conteo, movimientos, autorización, revisión obsoleta, cierre perdido/F5 sin repetir, copia, turno nuevo, permisos, foco y 320-1366px en ambos temas.')
} finally { await context.close(); await browser.close() }
