import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1366,height:950},reducedMotion:'reduce'})
const page=await context.newPage();page.setDefaultTimeout(12000)
let configurar=true,zonas=[],mesas=[],contador=0,falloMesa=true
const errores=[],comandos=[],respuestas=new Map(),rev='a'.repeat(64)
page.on('pageerror',e=>errores.push(e.message))
await context.route('**/api/**',async route=>{
 const req=route.request(),ruta=new URL(req.url()).pathname.replace(/^\/api/,''),method=req.method()
 let body,status=200
 if(ruta==='/auth/session')body={usuario:{id:9876,nombre:'Administrador de prueba',rol:{nombre:configurar?'administrador':'mesero'},permisos:[{modulo:'mesas',accion:'gestionar'},...(configurar?[{modulo:'configuracion',accion:'gestionar'}]:[])]}}
 else if(ruta==='/salon'&&method==='GET')body={consultado_en:'2026-11-06T18:00:00Z',zonas,mesas}
 else if(ruta.startsWith('/salon/')&&method!=='GET'){
  const clave=req.headers()['idempotency-key'],datos=req.postDataJSON();comandos.push({ruta,method,clave,datos})
  if(respuestas.has(clave))body=respuestas.get(clave)
  else if(ruta==='/salon/zonas'&&method==='POST'){const zona={id:++contador,...datos,revision:rev};zonas.push(zona);body={zona};status=201;respuestas.set(clave,body)}
  else if(ruta.startsWith('/salon/zonas/')&&method==='DELETE'){const id=Number(ruta.split('/').at(-1));zonas=zonas.filter(z=>z.id!==id);body={eliminada:true,zona_id:id};respuestas.set(clave,body)}
  else if(ruta.startsWith('/salon/zonas/')&&method==='PATCH'){const id=Number(ruta.split('/').at(-1));const zona={...zonas.find(z=>z.id===id),nombre:datos.nombre,aforo_maximo:datos.aforo_maximo,revision:'b'.repeat(64)};zonas=zonas.map(z=>z.id===id?zona:z);body={zona};respuestas.set(clave,body)}
  else if(ruta==='/salon/mesas'&&method==='POST'){
   const mesa={id:1,zona_id:datos.zona_id,codigo_mesa:datos.codigo_mesa,capacidad_sillas:datos.capacidad_sillas,posicion_x:datos.posicion_x,posicion_y:datos.posicion_y,estado_actual:datos.habilitada?'libre':'inhabilitada',mesero_asignado_id:null,pedido_abierto:null,revision:rev};mesas.push(mesa);body={mesa};respuestas.set(clave,body);status=201
   if(falloMesa){falloMesa=false;status=503;body={mensaje:'Respuesta perdida de prueba'}}
  }else if(ruta==='/salon/mesas/1'&&method==='PATCH'){const mesa={...mesas[0],...datos,estado_actual:datos.habilitada?'libre':'inhabilitada',revision:'c'.repeat(64)};delete mesa.habilitada;mesas=[mesa];body={mesa};respuestas.set(clave,body)}
  else throw Error('Comando inesperado '+ruta)
 }else throw Error('API inesperada '+ruta)
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
})
const boton=n=>page.getByRole('button',{name:n,exact:true})
try{
 await page.goto('http://127.0.0.1:5173/salon');await page.getByRole('heading',{name:'Todavía no hay zonas registradas',exact:true}).waitFor()
 assert.ok(await boton('Nueva mesa').isDisabled())
 await boton('Nueva zona').click();await page.getByLabel('Nombre de la zona',{exact:true}).fill('Salón principal');await page.getByLabel('Aforo máximo',{exact:true}).fill('12');await boton('Guardar configuración').click()
 await page.getByRole('button',{name:/Salón principal.*0 mesas/}).waitFor();assert.equal(zonas.length,1)
 await boton('Nueva mesa').click();await page.getByLabel('Código de mesa',{exact:true}).fill('M01');await page.getByLabel('Número de sillas',{exact:true}).fill('4')
 await boton('Guardar configuración').click();await page.getByRole('alert').filter({hasText:'Respuesta perdida'}).waitFor();assert.equal(mesas.length,1)
 assert.ok(await boton('Cerrar ventana').isDisabled());await boton('Reintentar operación').click()
 await page.getByRole('button',{name:/^Mesa M01,/}).waitFor();assert.equal(mesas.length,1)
 const repetidos=comandos.filter(c=>c.ruta==='/salon/mesas');assert.equal(repetidos.length,2);assert.equal(repetidos[0].clave,repetidos[1].clave);assert.deepEqual(repetidos[0].datos,repetidos[1].datos)
 assert.ok(await boton('Eliminar zona vacía').isDisabled())
 await page.getByRole('button',{name:/^Mesa M01,/}).click();await boton('Editar configuración de mesa').click()
 await page.getByLabel('Disponibilidad',{exact:true}).selectOption('false');await boton('Guardar configuración').click();await page.getByRole('button',{name:/^Mesa M01, Inhabilitada/}).waitFor()
 await boton('Editar zona').click();await page.getByLabel('Nombre de la zona',{exact:true}).fill('Salón principal actualizado');await boton('Guardar configuración').click();await page.getByRole('button',{name:/Salón principal actualizado/}).waitFor()
 await boton('Nueva zona').click();await page.getByLabel('Nombre de la zona',{exact:true}).fill('Zona vacía');await boton('Guardar configuración').click();await page.getByRole('button',{name:/Zona vacía.*0 mesas/}).waitFor()
 await boton('Eliminar zona vacía').click();await boton('Eliminar zona').click();await page.getByRole('button',{name:/Salón principal actualizado/}).waitFor();assert.equal(zonas.length,1)
 for(const width of [320,390,768,1366,1920])for(const tema of ['claro','oscuro']){
  await page.setViewportSize({width,height:950})
  if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await boton(`Activar modo ${tema}`).click()
  await boton('Nueva mesa').click();await page.getByRole('heading',{name:'Nueva mesa',exact:true}).waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+width)
  const dialog=page.getByRole('dialog');assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),'Overflow modal '+width)
  if(process.argv[3]&&width===1366&&tema==='oscuro')await page.screenshot({path:process.argv[3]+'-formulario.png',animations:'disabled'})
  await boton('Cancelar').click()
 }
 if(process.argv[3]){await page.setViewportSize({width:1366,height:950});await page.screenshot({path:process.argv[3]+'-salon.png',animations:'disabled'})}
 configurar=false;await page.goto('http://127.0.0.1:5173/salon');await page.getByRole('button',{name:/^Mesa M01,/}).waitFor()
 assert.equal(await boton('Nueva zona').count(),0);assert.equal(await boton('Nueva mesa').count(),0)
 assert.deepEqual(errores,[])
 console.log('OK: crear/editar zona, crear/inhabilitar mesa, eliminar zona vacía, reintento ambiguo sin duplicar, controles restringidos y responsive 320–1920 en ambos temas.')
}finally{await browser.close()}
