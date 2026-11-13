import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage()
const clientes=Array.from({length:12},(_,i)=>({id:i+1,nombres:`Cliente ${String(i+1).padStart(2,'0')}`,apellidos:'Prueba',tipo_documento:'DNI',numero_documento:String(70000001+i),telefono_principal:String(987650001+i)}))
const errores=[];let falla=false,gestor=true,listados=0
page.on('pageerror',e=>errores.push(e.message))
await context.route('**/api/**',async route=>{
 const url=new URL(route.request().url()),ruta=url.pathname.replace(/^\/api/,'');let body,status=200
 if(ruta==='/auth/session')body={usuario:{id:9876,nombre:'Prueba clientes',rol:{nombre:gestor?'administrador':'mesero'},permisos:[{modulo:'clientes',accion:'buscar'},...(gestor?[{modulo:'clientes',accion:'gestionar'}]:[])]}}
 else if(ruta==='/clientes/listado'){
  listados++;assert.ok(gestor)
  if(falla){status=503;body={mensaje:'Error temporal del listado.'}}
  else{const pagina=Number(url.searchParams.get('pagina'));body={clientes:clientes.slice((pagina-1)*10,pagina*10),paginacion:{pagina,limite:10,total:12,totalPaginas:2}}}
 }else if(ruta==='/clientes')body={clientes:clientes.filter(c=>c.numero_documento===url.searchParams.get('documento')),paginacion:{pagina:1,limite:10,total:1,totalPaginas:1}}
 else if(ruta==='/clientes/1'){
  assert.equal(url.searchParams.get('documento'),clientes[0].numero_documento)
  body={cliente:{...clientes[0],nivel_vip:'bronce',puntos_vip_actuales:0,actividad:{compras_registradas:0,ultima_compra:null,segmento:'sin_compras'}}}
 }else if(ruta==='/clientes/1/direcciones')body={direcciones:[],paginacion:{pagina:1,limite:10,total:0,totalPaginas:0}}
 else throw new Error(`Ruta inesperada ${ruta}`)
 await route.fulfill({status,json:body})
})
const base=process.env.TEST_BASE_URL??'http://localhost:5173'
try{
 await page.goto(base+'/clientes')
 await page.getByText('Clientes registrados',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Ver perfil de Cliente 01 Prueba',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:/^Ver perfil de/}).count(),10)
 const paginacion=page.getByRole('navigation',{name:'Paginación de clientes'})
 await paginacion.getByRole('button',{name:'Siguiente',exact:true}).click()
 await page.getByRole('button',{name:'Ver perfil de Cliente 11 Prueba',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:/^Ver perfil de/}).count(),2)
 await page.getByLabel('Número de documento',{exact:true}).fill('70000001')
 await page.getByRole('button',{name:'Buscar',exact:true}).click()
 await page.getByText('Resultados de la última búsqueda',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Ver perfil de Cliente 01 Prueba',exact:true}).click()
 await page.getByRole('heading',{name:'Cliente 01 Prueba',exact:true}).waitFor()
 await page.getByRole('button',{name:'Cerrar perfil del cliente',exact:true}).click()
 await page.getByRole('button',{name:'Limpiar',exact:true}).click()
 await page.getByRole('button',{name:'Ver perfil de Cliente 10 Prueba',exact:true}).waitFor()
 await page.getByRole('button',{name:'Editar cliente Cliente 01 Prueba',exact:true}).click()
 await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click()
 for(const width of [1366,768,390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 }
 falla=true;await page.reload();await page.getByRole('button',{name:'Reintentar búsqueda',exact:true}).waitFor()
 falla=false;await page.getByRole('button',{name:'Reintentar búsqueda',exact:true}).click()
 await page.getByRole('button',{name:'Ver perfil de Cliente 01 Prueba',exact:true}).waitFor()
 const anteriores=listados;gestor=false;await page.goto(base+'/clientes')
 await page.getByText('Acceso de consulta',{exact:true}).waitFor()
 assert.equal(listados,anteriores)
 assert.equal(await page.getByRole('button',{name:'Nuevo cliente',exact:true}).count(),0)
 assert.deepEqual(errores,[])
 console.log('OK: listado inicial, paginación, búsqueda, limpiar, perfil y edición, reintento, consulta limitada para mesero, 320-1366 px.')
}finally{await browser.close()}
