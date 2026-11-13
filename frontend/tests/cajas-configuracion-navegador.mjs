// API interceptada: no crea cajas ni cuentas en la base de datos.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(10000);
let admin=true,fallo=true;const cajas=[],comandos=[],errores=[];
const cajeros=[{id:1,nombre:'Henry Administrador',perfil:'administrador',usuario:'admin'},{id:2,nombre:'Rosa Cajera',perfil:'cajero',usuario:'rosa'}];
page.on('pageerror',e=>errores.push(e.message));
await ctx.route('**/api/**',async route=>{
  const req=route.request(),ruta=new URL(req.url()).pathname.replace(/^\/api/,''),method=req.method();let status=200,body;
  if(ruta==='/auth/session')body={usuario:{id:admin?1:2,nombre:admin?'Henry Administrador':'Rosa Cajera',rol:{nombre:admin?'administrador':'cajero'},permisos:[{modulo:'caja',accion:'gestionar'},{modulo:'ventas',accion:'cobrar'},...(admin?[{modulo:'seguridad',accion:'gestionar'}]:[])]}};
  else if(ruta==='/caja/sesion')body={cajas:cajas.filter(c=>c.estado==='activa'&&c.cajero_asignado_id===(admin?1:2)),sesion:null};
  else if(ruta==='/caja/configuracion'&&method==='GET')body={cajas:cajas.map(c=>({...c,cajero:cajeros.find(u=>u.id===c.cajero_asignado_id)?{...cajeros.find(u=>u.id===c.cajero_asignado_id),habilitado:true}:null})),cajeros};
  else if(ruta.startsWith('/caja/configuracion')&&method!=='GET'){
    const datos=req.postDataJSON(),clave=req.headers()['idempotency-key'];comandos.push({datos,clave,method});
    if(method==='POST'){
      if(!cajas.length)cajas.push({id:10,...datos,version_config:0,sesion_abierta:null});
      if(fallo){fallo=false;status=503;body={mensaje:'Respuesta temporalmente perdida.'}}else{status=201;body={caja:cajas[0]};}
    }else{Object.assign(cajas[0],datos,{version_config:datos.version_config+1});body={caja:cajas[0]};}
  }else throw Error('API inesperada '+ruta);
  await route.fulfill({status,json:body});
});
const boton=n=>page.getByRole('button',{name:n,exact:true});
try{
  await page.goto(process.env.TEST_BASE_URL??'http://127.0.0.1:5173/caja');await boton('Administrar cajas').click();await boton('Crear caja').click();
  await page.getByLabel('Nombre de caja',{exact:true}).fill('Caja principal');await page.getByLabel('Cajero asignado',{exact:true}).selectOption('1');await page.getByLabel('IP del equipo (opcional)',{exact:true}).fill('192.168.1.20');
  await page.getByRole('dialog').getByRole('button',{name:'Crear caja',exact:true}).click();await page.getByRole('alert').filter({hasText:'Respuesta temporalmente perdida'}).waitFor();
  assert.ok(await page.getByLabel('Nombre de caja',{exact:true}).isDisabled());await boton('Reintentar operación').click();await boton('Configurar Caja principal').waitFor();
  assert.equal(comandos[0].clave,comandos[1].clave);assert.deepEqual(comandos[0].datos,comandos[1].datos);assert.equal(cajas.length,1);
  await page.getByRole('combobox',{name:'Caja',exact:true}).getByRole('option',{name:'Caja principal',exact:true}).waitFor({state:'attached'});
  for(const width of [320,390,768,1366,1920])for(const tema of ['claro','oscuro']){
    await page.setViewportSize({width,height:1000});if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await boton(`Activar modo ${tema}`).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+width);
    await boton('Configurar Caja principal').click();assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'Overflow diálogo '+width);
    if(process.argv[3]&&width===1366&&tema==='oscuro')await page.screenshot({path:process.argv[3]+'-formulario.png'});await boton('Cancelar').click();
  }
  await boton('Configurar Caja principal').click();await page.getByLabel('Cajero asignado',{exact:true}).selectOption('2');await page.getByLabel('Estado de caja',{exact:true}).selectOption('mantenimiento');await boton('Guardar caja').click();await page.getByText('Rosa Cajera',{exact:true}).waitFor();
  assert.equal(cajas[0].cajero_asignado_id,2);assert.equal(cajas[0].estado,'mantenimiento');assert.equal(comandos.at(-1).datos.version_config,0);
  cajas[0].sesion_abierta={id:12,cajero_id:2};await boton('Actualizar configuración').click();await page.getByText('Turno #12 abierto. Cierra el turno antes de editar.',{exact:true}).waitFor();assert.ok(await boton('Configurar Caja principal').isDisabled());
  if(process.argv[3]){await page.setViewportSize({width:1366,height:1000});await page.screenshot({path:process.argv[3]+'-listado.png',fullPage:true});}
  admin=false;cajas[0].estado='activa';await page.reload();await page.getByRole('heading',{name:'Arqueo de caja',exact:true}).waitFor();assert.equal(await boton('Administrar cajas').count(),0);await page.getByRole('combobox',{name:'Caja',exact:true}).getByRole('option',{name:'Caja principal',exact:true}).waitFor({state:'attached'});
  assert.deepEqual(errores,[]);console.log('OK: alta, asignación, mantenimiento, versión, reintento idempotente sin duplicados, actualización de apertura, turno abierto protegido, permisos y tamaños 320-1920 en ambos temas.');
}finally{await browser.close();}
