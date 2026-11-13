import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {reporteFixture,analiticaFixture,actividadFixture} from './reportes-fixture.mjs'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser=await chromium.launch({channel:'msedge',headless:true})
const context=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce',acceptDownloads:true})
const page=await context.newPage();page.setDefaultTimeout(12000)
const errores=[],consultas=[],escrituras=[]
let permitido=true,vacio=false,fallar=false,demora=0
page.on('pageerror',e=>errores.push(e.message))
await context.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url()),ruta=url.pathname.replace(/^\/api/,'')
 let body,status=200
 if(ruta==='/auth/session')body={usuario:{id:9987,nombre:'Gerente de prueba',rol:{nombre:'administrador'},permisos:permitido?[{modulo:'reportes',accion:'leer'},{modulo:'configuracion',accion:'gestionar'}]:[]}}
 else if(ruta==='/reportes/gerencial'||ruta==='/reportes/resultados'){
  consultas.push(url.searchParams.toString());if(demora)await new Promise(r=>setTimeout(r,demora))
  if(fallar){status=503;body={mensaje:'Fallo temporal de prueba'}}else{
   body=reporteFixture();body.filtros={...body.filtros,...Object.fromEntries(url.searchParams)};body.analitica=analiticaFixture();body.actividad_financiera=actividadFixture();body.compras={cantidad:1,total:'118.00',saldadas:'118.00',pendientes_sin_abonos:'0.00',parciales:0,total_documentos_parciales:'0.00',saldo_pendiente:'0.00'}
   if(vacio){body.compras={cantidad:0,total:'0.00',saldadas:'0.00',pendientes_sin_abonos:'0.00',parciales:0,total_documentos_parciales:'0.00',saldo_pendiente:'0.00'};body.actividad_financiera={compras_por_dia:[],gastos_por_dia:[],movimientos_por_dia:[],proveedores:[],compras_documentos:[],borradores:{cantidad:0,total:'0.00'}};body.gastos={...body.gastos,total:'0.00',por_clase:{operativo:'0.00',financiero:'0.00',extraordinario:'0.00',provision_impuesto:'0.00'}};body.movimientos={ingresos:'0.00',egresos:'0.00',egresos_sin_gasto:'0.00'};body.ventas={cantidad:0,total:'0.00',base_registrada:'0.00',impuesto_registrado:'0.00',ticket_promedio:'0.00'};body.serie_ventas=[];body.medios=body.medios.map(m=>({...m,cobrado:'0.00',devuelto:'0.00',neto:'0.00'}));body.analitica={...analiticaFixture(),productos_vendidos:0,productos_top:[],productos_baja_rotacion:[],canales:[],meseros:[],categorias:[],calor:[],horas:Array.from({length:24},(_,hora)=>({hora,cantidad:0,total:'0.00'}))}}
  }
 }else if(ruta==='/reportes/gastos/categorias')body={categorias:[{id:2,nombre:'Servicios',es_deducible_impuestos:false}]}
 else if(ruta==='/reportes/gastos'&&req.method()==='GET')body={gastos:[],paginacion:{siguiente:null}}
 else if(ruta==='/reportes/gastos'&&req.method()==='POST'){escrituras.push({datos:req.postDataJSON(),clave:req.headers()['idempotency-key']});body={gasto:{id:55}}}
 else throw Error('API inesperada '+ruta)
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
})
try{
 await page.clock.setFixedTime(new Date('2026-11-13T18:00:00Z'));await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/reportes')
 await page.getByRole('heading',{name:'Cómo va el negocio',exact:true}).waitFor()
 await page.locator('.vz-report-kpi').filter({hasText:'Compras y otros gastos'}).getByText('S/ 132.00',{exact:true}).waitFor()
 assert.equal(await page.locator('canvas').count(),1)
 const vistas=page.getByRole('navigation',{name:'Contenido del reporte'})
 const peticiones=consultas.length
 await vistas.getByRole('button',{name:'Compras y gastos',exact:true}).click()
 await page.getByRole('heading',{name:'Control de compras y gastos',exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),2)
 await vistas.getByRole('button',{name:'Documentos y caja',exact:true}).click();await page.getByRole('table',{name:'Compras confirmadas incluidas en el reporte'}).waitFor()
 assert.equal(await page.getByText('TEST-COMPRA',{exact:true}).count(),1);assert.equal(await page.locator('canvas').count(),1)
 await vistas.getByRole('button',{name:'Ventas y atención',exact:true}).click()
 await page.getByRole('heading',{name:'Productos más vendidos',exact:true}).waitFor()
 assert.equal(await page.locator('canvas').count(),9);assert.equal(consultas.length,peticiones,'Cambiar vistas no vuelve a consultar el reporte')
 assert.equal(await page.getByRole('heading',{name:'Estado de resultados · cuatro niveles',exact:true}).count(),0)
 await page.getByLabel('Desde',{exact:true}).fill('2026-11-01');await page.getByLabel('Hasta',{exact:true}).fill('2026-11-06')
 await page.getByText('Más filtros',{exact:false}).click()
 await page.getByLabel('Canal',{exact:true}).selectOption('salon')
 await page.getByLabel('Mesero / responsable',{exact:true}).selectOption('20')
 const antes=consultas.length;await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('.vz-report-contexto')?.textContent.includes('Responsable 20'))
 assert.ok(consultas.length>antes&&consultas.at(-1).includes('canal=salon')&&consultas.at(-1).includes('mesero_id=20'))
 for(const width of [320,390,768,1366,1920])for(const tema of ['claro','oscuro']){
  await page.setViewportSize({width,height:1000})
  if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await page.getByRole('button',{name:`Activar modo ${tema}`,exact:true}).click()
  await page.getByRole('heading',{name:'Productos más vendidos',exact:true}).waitFor()
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}/${tema}: ${JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll("main *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,c:e.className,w:e.getBoundingClientRect().width}))))}`)
  assert.ok((await page.locator('canvas').evaluateAll(xs=>xs.map(c=>({w:c.width,h:c.height})))).every(c=>c.w>0&&c.h>0))
  await page.waitForFunction(oscuro=>Array.from(document.querySelectorAll('canvas')).every(c=>{const d=c.getContext('2d').getImageData(1,1,1,1).data;return oscuro?d[0]<70&&d[1]<70&&d[2]<70:d[0]>240&&d[1]>240&&d[2]>240}),tema==='oscuro')
  if(process.argv[3]&&width===1366&&tema==='oscuro'){
   await page.screenshot({path:process.argv[3]+'-dashboard.png',animations:'disabled'})
   await page.getByRole('heading',{name:'Productos más vendidos',exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:process.argv[3]+'-graficos.png',animations:'disabled'})
  }
 }
 const descarga=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PNG de Productos más vendidos',exact:true}).click();assert.ok((await descarga).suggestedFilename().endsWith('.png'))
 demora=350;await page.getByRole('button',{name:'Actualizar reporte',exact:true}).click();await page.getByRole('status').filter({hasText:'Consultando reporte'}).waitFor();assert.ok(await page.getByRole('button',{name:'Exportar CSV',exact:true}).isDisabled());demora=0
 await page.getByRole('button',{name:'Exportar CSV',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Exportar CSV')?.disabled)
 fallar=true;await page.getByRole('button',{name:'Actualizar reporte',exact:true}).click();await page.getByRole('alert').filter({hasText:'Fallo temporal'}).waitFor();assert.equal(new URL(page.url()).pathname,'/reportes')
 fallar=false;vacio=true;await page.getByRole('button',{name:'Reintentar reporte',exact:true}).click();await page.getByText('Todavía no hay ventas en el periodo seleccionado.',{exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),0)
 vacio=false;await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/estado-resultados');await page.getByRole('heading',{name:'Estado de resultados · cuatro niveles',exact:true}).waitFor()
 assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.getByRole('heading',{name:'Productos más vendidos',exact:true}).count(),0)
 await page.getByRole('row').filter({hasText:'1 · Utilidad bruta'}).getByText('S/ 80.0000',{exact:true}).waitFor()
 await page.getByRole('row').filter({hasText:'4 · Utilidad neta tras provisión'}).getByText('S/ 66.0000',{exact:true}).waitFor()
 await page.getByRole('region',{name:'Total de compras y gastos registrados'}).getByText('S/ 132.00',{exact:true}).waitFor()
 for(const width of [320,390,768,1366])for(const tema of ['claro','oscuro'])for(const vista of ['Compras y gastos','Documentos y caja','Resultado del negocio']){
  await page.setViewportSize({width,height:1000})
  if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await page.getByRole('button',{name:`Activar modo ${tema}`,exact:true}).click()
  await page.getByRole('navigation',{name:'Contenido del reporte'}).getByRole('button',{name:vista,exact:true}).click()
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Vista ${vista}/${width}/${tema}`)
  if(process.argv[3]&&width===1366&&tema==='oscuro')await page.screenshot({path:process.argv[3]+'-'+vista.replaceAll(' ','-')+'.png',animations:'disabled'})
 }
 await page.getByRole('button',{name:'Registrar gasto',exact:true}).click();await page.getByRole('dialog').waitFor()
 for(const width of [320,390,1366]){await page.setViewportSize({width,height:1000});assert.ok(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'Formulario de gasto '+width)}
 await page.getByLabel('Descripción',{exact:true}).fill('Alquiler de prueba')
 await page.getByLabel('Monto S/',{exact:true}).fill('200.00')
 await page.getByRole('button',{name:'Guardar gasto / categoría',exact:true}).click();await page.getByRole('status').filter({hasText:'Gasto registrado'}).waitFor()
 assert.equal(escrituras.length,1);assert.equal(escrituras[0].datos.clasificacion,'operativo');assert.ok(escrituras[0].clave)
 await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click()
 await page.emulateMedia({media:'print'})
 assert.equal(await page.locator('.vz-sidebar').evaluate(el=>getComputedStyle(el).display),'none')
 assert.equal(await page.locator('.vz-admin-grid').evaluate(el=>getComputedStyle(el).display),'block')
 await page.emulateMedia({media:'screen'})
 for(const width of [320,390,1366]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow resultados '+width)}
 if(process.argv[3]){await page.setViewportSize({width:1366,height:1000});await page.screenshot({path:process.argv[3]+'-resultados.png',fullPage:true,animations:'disabled'})}
 permitido=false;await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/estado-resultados');await page.getByRole('heading',{name:'Estado de resultados · cuatro niveles',exact:true}).waitFor({state:'hidden',timeout:1500}).catch(()=>{})
 assert.equal(await page.getByRole('heading',{name:'Estado de resultados · cuatro niveles',exact:true}).count(),0)
 assert.deepEqual(errores,[])
 console.log('OK: resumen inicial, vistas de ventas/compras/documentos sin recargar filtros, gráficos y detalles preservados, filtros avanzados, errores y PNG, resultado primero, registro de gasto en modal, impresión, permisos y adaptación 320-1920 en ambos temas.')
}finally{await browser.close()}
