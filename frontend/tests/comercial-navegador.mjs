// Pruebas de fallos con el almacenamiento y Web Locks reales del navegador.
// Importar módulos desde el test no añade ningún puente global al producto.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const navegador = await chromium.launch({ channel: 'msedge', headless: true })
const contexto = await navegador.newContext()
const pagina = await contexto.newPage()
let modo = 'crear', posts = 0, resultado, gate, llegada
const errores = []
pagina.on('pageerror', e => errores.push(e.message))
await contexto.route('http://localhost:5173/prueba-operaciones', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="es"><title>Prueba de operaciones</title><body>Prueba aislada de módulos</body></html>' }))
await contexto.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  let body, status = 200
  if (ruta === '/auth/session') body = { usuario: { id: 9876, nombre: 'Prueba', rol: { nombre: 'cajero' }, permisos: [{ modulo: 'ventas', accion: 'cobrar' }] } }
  else if (ruta === '/test-comercial') {
    posts++; assert.match(req.headers()['idempotency-key'], /^[a-zA-Z0-9_-]{8,64}$/)
    if (modo === 'espera') { llegada(); await new Promise(r => { gate = r }); body = resultado }
    else if (modo === 'perdida') return route.abort('failed')
    else if (modo === 'rechazo') { status = 409; body = { codigo: 'STOCK_INSUFICIENTE', mensaje: 'Sin stock' } }
    else body = resultado
  } else if (ruta.startsWith('/pedidos/operaciones/')) {
    if (req.method() === 'POST') body = { cancelada: true }
    else if (modo === '404') { status = 404; body = { mensaje: 'No hay resultado' } }
    else body = resultado
  } else { status = 404; body = { mensaje: 'No encontrado' } }
  await route.fulfill({ status, json: body })
})
const inicializar = (disco = false) => pagina.evaluate(async disco => {
  const { useAuthStore: a } = await import('/src/stores/auth.store.js')
  const { useCartStore: c } = await import('/src/stores/useCartStore.js')
  const { leerCarritoGuardado, guardarCarrito } = await import('/src/utils/carrito-persistencia.js')
  a.setState({ estado: 'autenticado', usuario: { id: 9876, permisos: [] } })
  c.setState({ usuarioCarritoId: 9876, carritoPreparado: true, lineas: disco ? leerCarritoGuardado(9876).lineas : [
    { id: '00000000-0000-4000-8000-000000000001', productoId: 1, varianteId: null, modificadoresIds: [], cantidad: 1, indicaciones: 'Pecho' },
    { id: '00000000-0000-4000-8000-000000000002', productoId: 2, varianteId: null, modificadoresIds: [], cantidad: 1, indicaciones: '' }
  ] })
  guardarCarrito(9876, c.getState().lineas)
  c.subscribe(s => { if (s.usuarioCarritoId === 9876) guardarCarrito(9876, s.lineas) })
}, disco)
const ejecutar = (tipo, pedidoId = null) => pagina.evaluate(async ({ tipo, pedidoId }) => {
  const m = await import('/src/stores/comercial.store.js')
  const { useCartStore: c } = await import('/src/stores/useCartStore.js')
  try {
    return await m.ejecutarComercial({ tipo, ruta: '/test-comercial', pedidoId, origen: await m.capturarOrigen(c.getState().lineas), cuerpo: { referencia: 'SECRETO-NO-PERSISTIR' } })
  } catch (e) { return { error: e.message } }
}, { tipo, pedidoId })
const registro = () => pagina.evaluate(() => JSON.parse(localStorage.getItem('la-veneziana-comercial-v1:9876')))
try {
  await pagina.goto('http://localhost:5173/prueba-operaciones')
  await inicializar()
  resultado = { pedido: { id: '42', codigo_pedido: 'P-42' } }
  const creado = await ejecutar('pedido.crear')
  assert.ok(!creado.error, JSON.stringify(creado))
  assert.ok((await registro()).vinculos['42'])
  assert.equal(await pagina.evaluate(async () => (await import('/src/stores/useCartStore.js')).useCartStore.getState().lineas.length), 2)
  // Editar una línea y añadir otra después del registro: solo retirar la intacta.
  await pagina.evaluate(async () => {
    const { useCartStore: c } = await import('/src/stores/useCartStore.js')
    c.getState().actualizarLinea('00000000-0000-4000-8000-000000000002', { cantidad: 2 })
    c.getState().agregarLinea({ productoId: 3, cantidad: 1 })
  })
  resultado = { venta: { id: '77', pedido_id: '42', total: '10.00', serie_correlativo: 'T-77', impresion: { job_uid: 'print_test_123', estado: 'pendiente' } }, pedido: { id: '42', estado_cuenta: 'pagada' } }
  modo = 'perdida'
  assert.ok((await ejecutar('pedido.cobrar', '42')).error)
  assert.equal(await pagina.evaluate(() => JSON.stringify({ ...localStorage }).includes('SECRETO-NO-PERSISTIR')), false)
  const identidad = (await registro()).pendiente.clave
  assert.ok((await ejecutar('pedido.cobrar', '42')).error)
  const cantidadPosts = posts
  // Una recarga mantiene la identidad. La recuperación consulta; no reenvía.
  await pagina.reload()
  await inicializar(true)
  assert.equal((await registro()).pendiente.clave, identidad)
  modo = 'crear'
  await pagina.evaluate(async () => (await import('/src/stores/comercial.store.js')).recuperarComercial())
  await pagina.waitForFunction(() => !JSON.parse(localStorage.getItem('la-veneziana-comercial-v1:9876')).pendiente)
  assert.equal(posts, cantidadPosts)
  const conservadas = await pagina.evaluate(async () => (await import('/src/stores/useCartStore.js')).useCartStore.getState().lineas)
  assert.equal(conservadas.length, 2)
  assert.ok(!conservadas.some(l => l.id === '00000000-0000-4000-8000-000000000001'))
  assert.equal((await registro()).ultimaVenta.id, '77')
  // 404 NO libera la operación. Resolver deja cancelada la identidad anterior.
  modo = 'perdida'; await ejecutar('pedido.crear')
  modo = '404'
  const sinResultado = await pagina.evaluate(async () => { try { await (await import('/src/stores/comercial.store.js')).recuperarComercial() } catch (e) { return e.message } })
  assert.ok(sinResultado); assert.ok((await registro()).pendiente)
  await pagina.evaluate(async () => (await import('/src/stores/comercial.store.js')).recuperarComercial(true))
  assert.equal((await registro()).pendiente, null)
  // Rechazo conocido conserva el carrito y permite corregirlo.
  modo = 'rechazo'; assert.ok((await ejecutar('pedido.crear')).error); assert.equal((await registro()).pendiente, null)
  // Almacenamiento bloqueado: fallo antes del POST.
  const anteriores = posts
  await pagina.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Almacenamiento bloqueado') } })
  assert.ok((await ejecutar('pedido.crear')).error); assert.equal(posts, anteriores)
  await pagina.reload()
  await inicializar()
  // Cambio de usuario durante una respuesta: no limpiar el carrito ajeno.
  modo = 'espera'; const llego = new Promise(r => { llegada = r })
  const pendiente = ejecutar('pedido.cobrar', '42'); await llego
  const otraPestana = await contexto.newPage()
  await otraPestana.goto('http://localhost:5173/prueba-operaciones')
  const antesCompetencia = posts
  const competencia = await otraPestana.evaluate(async () => {
    const { useAuthStore: a } = await import('/src/stores/auth.store.js')
    a.setState({ estado: 'autenticado', usuario: { id: 9876 } })
    try { await (await import('/src/stores/comercial.store.js')).ejecutarComercial({ tipo: 'pedido.crear', ruta: '/test-comercial', cuerpo: {} }) }
    catch (e) { return e.message }
  })
  assert.ok(competencia); assert.equal(posts, antesCompetencia)
  await otraPestana.close()
  await pagina.evaluate(async () => {
    const { useAuthStore: a } = await import('/src/stores/auth.store.js')
    const { useCartStore: c } = await import('/src/stores/useCartStore.js')
    a.setState({ usuario: { id: 9999, permisos: [] } }); c.setState({ usuarioCarritoId: 9999, lineas: [{ id: 'ajena', productoId: 1, cantidad: 1 }] })
  })
  gate(); assert.ok((await pendiente).error)
  assert.ok((await registro()).pendiente)
  assert.equal(await pagina.evaluate(async () => (await import('/src/stores/useCartStore.js')).useCartStore.getState().lineas[0].id), 'ajena')
  assert.deepEqual(errores, [])
  console.log('OK comercial: confirmación, limpieza selectiva, F5, respuesta perdida, identidad estable, 404 seguro, resolución, rechazo, almacenamiento bloqueado y usuario diferente.')
} finally { await contexto.close(); await navegador.close() }
