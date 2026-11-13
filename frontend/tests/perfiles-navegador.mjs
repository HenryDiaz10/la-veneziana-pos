import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { permisosEfectivos } from '../../backend/src/security/perfiles.js'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const browser=await chromium.launch({channel:'msedge',headless:true})
const base=process.env.TEST_BASE_URL??'http://localhost:5173'
const permisos=[['pedidos','crear'],['mesas','gestionar'],['kds','operar'],['ventas','cobrar'],['ventas','devolver'],['caja','gestionar'],['catalogo','gestionar'],['inventario','gestionar'],['clientes','buscar'],['clientes','gestionar'],['reportes','leer'],['seguridad','gestionar'],['configuracion','gestionar']].map(([modulo,accion])=>({modulo,accion}))
const perfiles={administrador:['/inicio','/trabajadores','/reportes','/historial-ventas','/estado-resultados','/salon','/caja','/catalogo','/recetas','/clientes','/inventario','/compras'],mesero:['/inicio','/salon','/tomar-pedido','/clientes'],cajero:['/inicio','/pos','/pagos','/caja','/clientes'],cocinero:['/inicio','/cocina']}
try{
 for(const [rol,rutas] of Object.entries(perfiles)){
  const c=await browser.newContext(),p=await c.newPage(),errores=[],api=[]
  p.on('pageerror',e=>errores.push(e.message))
  await c.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname
   const session=path.endsWith('/auth/session');if(!session)api.push(path)
   return route.fulfill({status:session?200:503,json:session?{usuario:{id:9876,nombre:`Prueba ${rol}`,rol:{nombre:rol},permisos:permisosEfectivos(rol,permisos)}}:{mensaje:'Consulta de prueba no disponible.'}})
  })
  await p.goto(base+'/inicio')
  const menu=p.getByRole('navigation',{name:'Navegación principal'})
  await menu.waitFor()
  assert.deepEqual(await menu.getByRole('link').evaluateAll(a=>a.map(e=>e.getAttribute('href'))),rutas)
  assert.deepEqual((await p.locator('.vz-shortcut').evaluateAll(a=>a.map(e=>e.getAttribute('href')))),rutas.filter(r=>r!=='/inicio'))
  for(const ruta of [...new Set(Object.values(perfiles).flat()),'/seguridad','/componentes','/pruebas-carrito'].filter(r=>!rutas.includes(r))){
   await p.goto(base+ruta)
   await p.getByRole('heading',{name:'No tienes acceso a esta sección',exact:true}).waitFor()
  }
  assert.deepEqual(api,[],`No montar módulos ajenos al rol ${rol}`)
  await p.setViewportSize({width:390,height:844});await p.goto(base+'/inicio')
  await p.getByRole('button',{name:'Abrir menú',exact:true}).click();await menu.waitFor()
  assert.deepEqual(await menu.getByRole('link').evaluateAll(a=>a.map(e=>e.getAttribute('href'))),rutas)
  assert.deepEqual(errores,[])
  await c.close()
 }
 console.log('OK: menús e Inicio exactos de los cuatro perfiles, URLs ajenas bloqueadas antes de consultar APIs, menú móvil y cero errores.')
}finally{await browser.close()}
