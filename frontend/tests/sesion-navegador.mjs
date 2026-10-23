// API simulada y reloj controlado: no usa credenciales ni sesiones reales.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime=process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const {chromium}=await import(pathToFileURL(runtime).href)
const browser=await chromium.launch({channel:'msedge',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:900}})
const page=await context.newPage()
const usuario={id:9876,nombre:'Operador de prueba',rol:{nombre:'cajero'},permisos:[{modulo:'ventas',accion:'cobrar'}]}
const producto={id:7,nombre:'Producto de prueba de sesión',sku:'PRUEBA-SESION',categoria_id:1,
  precio_venta_base:'10.00',estado:'activo',tipo_producto:'plato_preparado',imagen_url:null}
let modo='activa', autenticado=true, consultas=0, liberarConsulta, notificarDemora
let limiteAbsoluto=null
const errores=[]
page.on('pageerror',e=>errores.push(e.message))
await context.route('**/api/**',async route=>{
  const ruta=new URL(route.request().url()).pathname.replace(/^\/api/,'')
  let status=200, body={}
  if(ruta==='/auth/session'){
    consultas++
    const ahora=await page.evaluate(()=>Date.now())
    limiteAbsoluto??=ahora+8*3600000
    const identidad=autenticado
    if(modo==='demorada')await new Promise(resolve=>{liberarConsulta=resolve;notificarDemora?.()})
    if(modo==='fallo'){status=503;body={mensaje:'Conexión temporalmente interrumpida.'}}
    else if(modo==='vencida'||!identidad||ahora>=limiteAbsoluto){status=401;body={mensaje:'Autenticación requerida.'}}
    else body={usuario}
  }else if(ruta==='/auth/logout'){autenticado=false;status=204}
  else if(ruta==='/auth/login'){autenticado=true;limiteAbsoluto=await page.evaluate(()=>Date.now()+8*3600000);body={usuario}}
  else if(ruta==='/pos/catalogo')body={categorias:[{id:1,nombre:'Pruebas'}],productos:[producto],total:1}
  else if(ruta==='/pos/productos/7')body={producto,configuracion:{productoId:7,variantes:[],grupos:[]}}
  else {status=404;body={mensaje:'Ruta no simulada'}}
  await route.fulfill(status===204?{status}:{status,json:body})
})
try{
  await page.clock.install({time:new Date('2026-10-17T12:00:00Z')})
  await page.clock.pauseAt(new Date('2026-10-17T12:00:01Z'))
  await page.goto('http://localhost:5173/pos')
  await page.getByRole('button',{name:'Añadir Producto de prueba de sesión al pedido',exact:true}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Añadir al pedido',exact:true}).click()
  await page.locator('.pos-receipt').getByText('S/ 10.00',{exact:true}).first().waitFor()
  await page.getByRole('button',{name:'Añadir Producto de prueba de sesión al pedido',exact:true}).click()
  const modal=page.getByRole('dialog')
  await modal.getByLabel('Cantidad a preparar').fill('7')
  async function minutoActivo(){
    await page.keyboard.press('Shift')
    const respuesta=page.waitForResponse(r=>r.url().includes('/auth/session'))
    await page.clock.runFor(60000)
    await respuesta
  }
  for(let minuto=0;minuto<17;minuto++){
    await minutoActivo()
    assert.ok(await modal.isVisible())
    assert.equal(await modal.getByLabel('Cantidad a preparar').inputValue(),'7')
  }
  assert.ok(consultas>=18&&consultas<=20,'Renovar sin una petición por cada tecla')
  modo='fallo'
  await minutoActivo()
  assert.ok(await modal.isVisible())
  assert.equal(await modal.getByLabel('Cantidad a preparar').inputValue(),'7')
  assert.ok(page.url().endsWith('/pos'))
  modo='activa'
  await minutoActivo()
  // Mantener la página sin pulsar ni escribir sigue comprobando la sesión,
  // incluso cuando está en segundo plano.
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'}))
  const antesDeInactividad=consultas
  for(let minuto=0;minuto<20;minuto++){
    const respuesta=page.waitForResponse(r=>r.url().includes('/auth/session'))
    await page.clock.runFor(60000)
    await respuesta
    assert.ok(await modal.isVisible())
    assert.equal(await modal.getByLabel('Cantidad a preparar').inputValue(),'7')
  }
  assert.equal(consultas,antesDeInactividad+20)
  await page.evaluate(()=>delete document.visibilityState)
  // Saltar hasta el límite absoluto de ocho horas: el siguiente control recibe
  // un 401 del servidor simulado y conserva el borrador confirmado.
  const restante=limiteAbsoluto-await page.evaluate(()=>Date.now())
  const vencimiento=page.waitForResponse(r=>r.url().includes('/auth/session')&&r.status()===401)
  await page.clock.fastForward(restante)
  await vencimiento
  await page.waitForURL('**/login')
  const guardado=await page.evaluate(id=>JSON.parse(localStorage.getItem(`la-veneziana-carrito-v1:${id}`)),usuario.id)
  assert.equal(guardado.lineas[0].cantidad,1,'El borrador confirmado permanece guardado')
  await page.getByText('La sesión venció o dejó de estar disponible. Vuelve a ingresar.',{exact:true}).waitFor()
  modo='activa'
  await page.getByLabel('Correo electrónico',{exact:true}).fill('operador@example.invalid')
  await page.getByLabel('Contraseña',{exact:true}).fill('clave-simulada-no-real')
  await page.getByRole('button',{name:/Ingresar/}).click()
  await page.getByRole('heading',{name:'Punto de venta',exact:true}).waitFor()
  // Una respuesta en vuelo no puede volver a autenticar después del logout.
  const rutaDemorada=new Promise(resolve=>{notificarDemora=resolve})
  modo='demorada'
  await page.keyboard.press('Shift')
  const iniciada=page.waitForRequest(r=>r.url().includes('/auth/session'))
  await page.clock.runFor(60000)
  await iniciada
  await rutaDemorada
  assert.equal(typeof liberarConsulta,'function')
  const cancelada=page.waitForEvent('requestfailed',{predicate:r=>r.url().includes('/auth/session')})
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await page.waitForURL('**/login')
  await cancelada
  liberarConsulta()
  await page.getByLabel('Correo electrónico',{exact:true}).waitFor()
  assert.ok(page.url().endsWith('/login'))
  assert.deepEqual(errores,[])
  console.log('OK: actividad y 20 minutos sin interacción en segundo plano, formulario intacto, fallo de red sin logout, corte al llegar a ocho horas y logout concurrente seguro.')
}finally{await context.close();await browser.close()}
