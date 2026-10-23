// Navegación real con API simulada. Fase 30: checkout y cobro explicito, sin pagos al preparar.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime = process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(runtime).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errores=[], solicitudes=[]
let modo='abierta', autorizado=true, version=3, propio=false, cobros=0
page.on('pageerror', e => errores.push(e.message))
await context.route('**/api/**', async route => {
  const req = route.request(), ruta = new URL(req.url()).pathname.replace(/^\/api/, '')
  solicitudes.push({ ruta, metodo: req.method() })
  let body, status=200
  if (ruta === '/auth/session') body={usuario:{id:9876,nombre:'Prueba pagos',rol:{nombre:'cajero'},permisos:autorizado?[{modulo:'ventas',accion:'cobrar'}]:[]}}
  else if(ruta==='/pedidos/42/contexto-pago')body={pedido:{id:'42',codigo_pedido:'P-PRUEBA-42',total:'100.00',version,estado_cuenta:modo,bloqueo_propio:propio,bloqueo_hasta:new Date(Date.now()+300000).toISOString(),bloqueo_vencido:false},sesion_caja:{id:1,nombre_caja:'Caja temporal'},finanzas_habilitadas:true,canje:{disponible:false,saldo_puntos:0,valor_punto_pen:null}}
  else if(ruta==='/pedidos/42/bloqueo-pago'){modo='bloqueada_en_pago';propio=true;version++;body={pedido:{id:'42',version}}}
  else if(ruta==='/pedidos/42/liberar-pago'){modo='abierta';propio=false;version++;body={pedido:{id:'42',version}}}
  else if(ruta==='/pedidos/42/cobro'){cobros++;modo='pagada';body={venta:{id:'77',pedido_id:'42',total:'100.00',serie_correlativo:'T-TEST',impresion:{job_uid:'print_test_123',estado:'pendiente'}},pedido:{id:'42',estado_cuenta:'pagada',version:++version}}}
  else if(ruta==='/pedidos/impresion/print_test_123')body={trabajo:{estado:'enviado'}}
  else if(ruta==='/pedidos/99/contexto-pago'){status=404;body={mensaje:'El pedido no existe.'}}
  else throw new Error(`Ruta inesperada ${req.method()} ${ruta}`)
  await route.fulfill({status,json:body})
})
try {
  await page.goto('http://localhost:5173/pagos?pedido=42')
  await page.getByRole('button',{name:'Distribuir pago',exact:true}).click()
  let dialog=page.getByRole('dialog'), cash=dialog.getByRole('group',{name:'Pago por Efectivo'}), digital=dialog.getByRole('group',{name:'Pago por Yape'})
  assert.ok(await dialog.getByRole('button',{name:'Preparar distribución',exact:true}).isDisabled())
  await dialog.getByRole('button',{name:'Yape',exact:true}).click()
  await cash.getByLabel('Efectivo recibido (S/)',{exact:true}).fill('100')
  await digital.getByLabel('Importe aplicado (S/)',{exact:true}).fill('40')
  await cash.getByRole('button',{name:'Completar saldo con Efectivo',exact:true}).click()
  assert.equal(await cash.getByLabel('Importe aplicado (S/)',{exact:true}).inputValue(),'60.00')
  await digital.getByLabel('Referencia de operación',{exact:true}).fill('YAPE-PRUEBA-123')
  await digital.getByLabel('Verifiqué el pago por Yape',{exact:true}).check()
  await dialog.getByText('Vuelto en efectivo: S/ 40.00',{exact:true}).waitFor()
  assert.ok(await dialog.getByRole('button',{name:'Preparar distribución',exact:true}).isEnabled())
  await digital.getByLabel('Importe aplicado (S/)',{exact:true}).fill('41')
  assert.ok(!(await digital.getByLabel('Verifiqué el pago por Yape',{exact:true}).isChecked()))
  assert.ok(await dialog.getByRole('button',{name:'Preparar distribución',exact:true}).isDisabled())
  await digital.getByLabel('Importe aplicado (S/)',{exact:true}).fill('40')
  await digital.getByLabel('Verifiqué el pago por Yape',{exact:true}).check()
  await page.keyboard.press('Escape')
  await dialog.getByText('¿Descartar esta distribución?',{exact:true}).waitFor()
  await dialog.getByRole('button',{name:'Seguir editando',exact:true}).click()
  assert.equal(await digital.getByLabel('Referencia de operación',{exact:true}).inputValue(),'YAPE-PRUEBA-123')
  await dialog.getByRole('button',{name:'Preparar distribución',exact:true}).click()
  const preparada=page.getByRole('region',{name:'Distribución preparada'})
  await preparada.getByText('Yape: S/ 40.00',{exact:true}).waitFor()
  await preparada.getByText('Efectivo: S/ 60.00',{exact:true}).waitFor()
  assert.ok((await preparada.innerText()).includes('No se ha cobrado'))
  await preparada.getByText('Vuelto en efectivo: S/ 40.00',{exact:true}).waitFor()
  await preparada.getByRole('button',{name:'Editar distribución',exact:true}).click()
  assert.equal(await page.getByRole('dialog').getByRole('group',{name:'Pago por Yape'}).getByLabel('Referencia de operación',{exact:true}).inputValue(),'YAPE-PRUEBA-123')
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click()
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage}).includes('YAPE-PRUEBA-123')),false)
  await page.getByRole('button',{name:'Actualizar pedido',exact:true}).click()
  await page.getByRole('button',{name:'Distribuir pago',exact:true}).waitFor({state:'visible'})
  assert.equal(await preparada.count(),0)
  for(const width of [1366,768,390,320])for(const tema of ['claro','oscuro']) {
    await page.setViewportSize({width,height:844})
    await page.evaluate(t=>document.documentElement.dataset.tema=t,tema)
    await page.getByRole('button',{name:'Distribuir pago',exact:true}).click()
    dialog=page.getByRole('dialog')
    await dialog.getByRole('button',{name:'Yape',exact:true}).click()
    await dialog.getByRole('group',{name:'Pago por Efectivo'}).getByLabel('Efectivo recibido (S/)',{exact:true}).fill('100')
    const layout=await dialog.evaluate(e=>({ancho:e.scrollWidth,visible:e.clientWidth,alto:e.getBoundingClientRect().height,ventana:innerHeight}))
    assert.ok(layout.ancho<=layout.visible+1,JSON.stringify({width,tema,layout}))
    assert.ok(layout.alto<=layout.ventana)
    // El foco queda dentro del diálogo y el resumen no reconstruye los campos.
    await page.keyboard.press('Tab')
    assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)))
    if(process.argv[3]&&width===390&&tema==='oscuro')await dialog.screenshot({path:process.argv[3]})
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
    await dialog.getByRole('button',{name:'Descartar distribución',exact:true}).click()
  }
  // La captura no cobra; solo la confirmacion explicita crea una venta.
  assert.equal(cobros,0)
  await page.setViewportSize({width:1366,height:900})
  await page.getByRole('button',{name:'Distribuir pago',exact:true}).click()
  await page.getByRole('dialog').getByLabel('Efectivo recibido (S/)',{exact:true}).fill('100')
  await page.getByRole('button',{name:'Preparar distribuci\u00f3n',exact:true}).click()
  await page.getByRole('button',{name:'Confirmar cobro',exact:true}).dblclick()
  await page.getByRole('region',{name:'\u00daltimo cobro confirmado'}).waitFor()
  assert.equal(cobros,1)
  await page.getByRole('button',{name:'Consultar impresi\u00f3n',exact:true}).click()
  await page.getByText('Formato simulado por el agente; sin confirmaci\u00f3n de impresi\u00f3n f\u00edsica.',{exact:true}).waitFor()
  modo='pagada'
  await page.goto('http://localhost:5173/pagos?pedido=42')
  await page.getByText('La cuenta está pagada; no se puede preparar otro pago.',{exact:true}).waitFor()
  assert.ok(await page.getByRole('button',{name:'Distribuir pago',exact:true}).isDisabled())
  await page.getByLabel('Número interno del pedido',{exact:true}).fill('99')
  await page.getByRole('button',{name:'Consultar pedido',exact:true}).click()
  await page.getByText('El pedido no existe.',{exact:true}).waitFor()
  autorizado=false
  await page.goto('http://localhost:5173/pagos?pedido=42')
  await page.getByRole('heading',{name:'No tienes acceso a esta sección',exact:true}).waitFor()
  assert.equal(cobros,1)
  assert.ok(solicitudes.filter(r=>r.metodo==='POST').every(r=>/bloqueo-pago|liberar-pago|cobro/.test(r.ruta)))
  assert.deepEqual(errores,[])
  console.log('OK fase 30: Yape40+efectivo60, vuelto40, verificación invalidada al editar, salida protegida, 320-1366px, temas, foco, errores, permisos y confirmacion explicita unica.')
} finally {await context.close();await browser.close()}
