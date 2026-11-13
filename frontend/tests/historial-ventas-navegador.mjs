import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage()
const errores=[];let fallar=false,detalleFalla=false,permitido=true
page.on('pageerror',e=>errores.push(e.message))
const venta={id:'42',pedido_id:'21',codigo:'T-HIST-42',fecha:'2026-11-13T16:00:00Z',estado:'emitida',documento:'ticket_interno',pedido:'P-21',canal:'salon',mesa:'M05',cliente:{id:1,nombre:'Ana <script>segura</script>',telefono:'987654321'},cajero:'Caja prueba',responsable:'Mesero prueba',base:'84.75',igv:'15.25',descuento:'0.00',total:'100.00',devuelto:'10.00',pagos:[{metodo:'efectivo',importe:'60.00',recibido:'70.00',vuelto:'10.00'},{metodo:'yape',importe:'40.00'}]}
const consultas=[]
await context.route('**/api/**',async route=>{
 const u=new URL(route.request().url()),ruta=u.pathname.replace(/^\/api/,'');let body,status=200
 if(ruta==='/auth/session')body={usuario:{id:9876,nombre:'Prueba historial',rol:{nombre:permitido?'administrador':'mesero'},permisos:permitido?[{modulo:'reportes',accion:'leer'}]:[{modulo:'pedidos',accion:'crear'}]}}
 else if(ruta==='/reportes/ventas'){
  consultas.push(Object.fromEntries(u.searchParams))
  if(fallar){status=503;body={mensaje:'Consulta temporalmente no disponible.'}}
  else {
   const f=Object.fromEntries(u.searchParams),vacia=f.busqueda==='NoExiste',pagina=Number(f.pagina)
   body={ventas:vacia?[]:[{...venta,id:pagina===2?'43':'42',codigo:pagina===2?'T-HIST-43':'T-HIST-42'}],resumen:{cantidad:vacia?0:11,total:vacia?'0.00':'100.00',devuelto:vacia?'0.00':'10.00',neto:vacia?'0.00':'90.00'},paginacion:{pagina,limite:10,total:vacia?0:11,totalPaginas:vacia?0:2},filtros:{desde:f.desde,hasta:f.hasta,estado:f.estado,canal:f.canal,medio:f.medio,busqueda:f.busqueda},consultado_en:new Date().toISOString()}
  }
 }else if(ruta==='/reportes/ventas/42'){
  if(detalleFalla){status=503;body={mensaje:'Detalle temporalmente no disponible.'}}
  else body={venta:{...venta,lineas:[{descripcion:'Pizza histórica',cantidad:2,precio_unitario:'50.00',total:'100.00',variante:'Familiar',modificadores:['Queso extra','Excluir: Cebolla'],indicaciones:'Bien caliente'}],devoluciones:[{id:'5',fecha:'2026-11-13T17:00:00Z',total:'10.00',motivo:'Reembolso de prueba'}]}}
 }else throw new Error(`Ruta inesperada ${ruta}`)
 await route.fulfill({status,json:body})
})
const base=process.env.TEST_BASE_URL??'http://localhost:5173'
try{
 await page.goto(base+'/historial-ventas')
 await page.getByRole('button',{name:'Ver venta T-HIST-42',exact:true}).waitFor()
 assert.equal(await page.locator('.vz-table script').count(),0)
 await page.getByLabel('Cliente o venta',{exact:true}).fill('Ana')
 await page.getByLabel('Estado',{exact:true}).selectOption('emitida')
 await page.getByLabel('Tipo de atención',{exact:true}).selectOption('salon')
 await page.getByLabel('Medio de pago',{exact:true}).selectOption('yape')
 await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click()
 await page.getByRole('button',{name:'Aplicar filtros',exact:true}).waitFor()
 await page.waitForFunction(()=>!document.querySelector('table[inert]'))
 assert.equal(consultas.at(-1).busqueda,'Ana');assert.equal(consultas.at(-1).medio,'yape');assert.equal(consultas.at(-1).estado,'emitida');assert.equal(consultas.at(-1).canal,'salon')
 const nav=page.getByRole('navigation',{name:'Paginación de ventas'})
 await nav.getByRole('button',{name:'Siguiente',exact:true}).click()
 await page.getByRole('button',{name:'Ver venta T-HIST-43',exact:true}).waitFor()
 assert.equal(consultas.at(-1).busqueda,'Ana')
 await nav.getByRole('button',{name:'Anterior',exact:true}).click()
 await page.getByRole('button',{name:'Ver venta T-HIST-42',exact:true}).waitFor()
 detalleFalla=true;await page.getByRole('button',{name:'Ver venta T-HIST-42',exact:true}).click()
 await page.getByRole('button',{name:'Reintentar detalle',exact:true}).waitFor();detalleFalla=false
 await page.getByRole('button',{name:'Reintentar detalle',exact:true}).click()
 const dialog=page.getByRole('dialog');await dialog.getByText('2 × Pizza histórica',{exact:true}).waitFor()
 await dialog.getByText(/Efectivo recibido: S\/ 70.00/).waitFor()
 await dialog.getByText(/Reembolso de prueba/).waitFor()
 for(const width of [1366,768,390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1))
 }
 if(process.argv[3])await dialog.screenshot({path:process.argv[3]+'-detalle.png'})
 await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click()
 await page.setViewportSize({width:1366,height:900})
  await page.evaluate(()=>window.scrollTo(0,0))
 if(process.argv[3])await page.screenshot({path:process.argv[3]+'-laptop.png',fullPage:true})
 await page.getByLabel('Cliente o venta',{exact:true}).fill('NoExiste')
 await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click()
 await page.getByText('No hay ventas con los filtros seleccionados.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click()
 await page.getByRole('button',{name:'Ver venta T-HIST-42',exact:true}).waitFor()
 assert.equal(consultas.at(-1).pagina,'1');assert.equal(consultas.at(-1).busqueda,'')
 fallar=true;await page.getByRole('button',{name:'Actualizar historial',exact:true}).click()
 await page.getByRole('button',{name:'Reintentar historial',exact:true}).waitFor();fallar=false
 await page.getByRole('button',{name:'Reintentar historial',exact:true}).click()
 await page.getByRole('button',{name:'Ver venta T-HIST-42',exact:true}).waitFor()
 await page.setViewportSize({width:320,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 permitido=false;await page.goto(base+'/historial-ventas')
 await page.getByRole('heading',{name:'No tienes acceso a esta sección',exact:true}).waitFor()
 assert.deepEqual(errores,[])
 console.log('OK: filtros aplicados y conservados al paginar, detalle histórico, pagos/devoluciones, vacío, limpiar, reintentos, permisos y 320-1366 px.')
}finally{await browser.close()}
