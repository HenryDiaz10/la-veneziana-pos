import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({channel:'msedge',headless:true}),ctx=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(12000);
const rev='a'.repeat(64),roles=[{id:1,nombre:'administrador',descripcion:'Administra',permisos:[{modulo:'seguridad',accion:'gestionar'}]},{id:2,nombre:'cocinero',descripcion:'Preparación',permisos:[{modulo:'kds',accion:'operar'}]},{id:3,nombre:'mesero',descripcion:'Salón',permisos:[{modulo:'mesas',accion:'gestionar'}]}];
let sesion=true,cocinero=false;
let personas=[{id:1,nombre:'Henry Administrador',usuario:'admin',email:'admin@example.invalid',documento:null,fecha_contratacion:null,estado:'activo',ultimo_acceso:null,rol:{id:1,nombre:'administrador'},revision:rev}];
const errores=[],comandos=[];page.on('pageerror',e=>errores.push(e.message));
await ctx.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url()),ruta=url.pathname.replace(/^\/api/,''),method=req.method();let status=200,body;
 const identidad={id:cocinero?2:1,nombre:cocinero?'Cocinero Uno':'Henry Administrador',email:null,usuario:cocinero?'cook01':'admin',rol:{nombre:cocinero?'cocinero':'administrador'},permisos:cocinero?roles[1].permisos:roles[0].permisos};
 if(ruta==='/auth/session'){status=sesion?200:401;body=sesion?{usuario:identidad}:{mensaje:'Sin sesión'}}
 else if(ruta==='/auth/login'){comandos.push({ruta,datos:req.postDataJSON()});sesion=true;cocinero=true;body={usuario:{...identidad,id:2,nombre:'Cocinero Uno',rol:{nombre:'cocinero'},permisos:roles[1].permisos}}}
 else if(ruta==='/roles')body={roles};
 else if(ruta==='/trabajadores'&&method==='GET'){
  const b=(url.searchParams.get('busqueda')??'').toLowerCase(),estado=url.searchParams.get('estado'),rol=url.searchParams.get('rol_id');
  const xs=personas.filter(p=>(!b||[p.nombre,p.usuario,p.email].join(' ').toLowerCase().includes(b))&&(!rol||String(p.rol.id)===rol)&&(estado==='todos'||estado==='vigentes'?estado==='todos'||p.estado!=='cesado':p.estado===estado));body={trabajadores:xs,paginacion:{pagina:1,limite:12,total:xs.length,totalPaginas:Math.ceil(xs.length/12)}};
 }else if(ruta.startsWith('/trabajadores')&&method!=='GET'){
  const datos=req.postDataJSON();comandos.push({ruta,method,datos,clave:req.headers()['idempotency-key']});
  if(ruta.endsWith('/password'))body={restablecida:true};
  else if(method==='DELETE'){personas=personas.map(p=>p.id===2?{...p,estado:'cesado'}:p);body={eliminado:true,id:2,estado:'cesado'}}
  else {const p={id:2,nombre:datos.nombre,usuario:datos.usuario,email:datos.email,documento:datos.documento,fecha_contratacion:datos.fecha_contratacion,estado:datos.estado,ultimo_acceso:null,rol:{id:datos.rol_id,nombre:roles.find(r=>r.id===datos.rol_id).nombre},revision:rev};personas=method==='POST'?[...personas,p]:personas.map(u=>u.id===2?p:u);body={trabajador:p};status=method==='POST'?201:200;}
 }else throw Error('API inesperada '+ruta);
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
const boton=n=>page.getByRole('button',{name:n,exact:true});
try{
 await page.goto('http://127.0.0.1:5173/trabajadores');await page.getByRole('heading',{name:'Mis trabajadores',exact:true}).waitFor();await boton('Editar Henry Administrador').waitFor();
 assert.ok(await boton('Eliminar Henry Administrador').isDisabled());assert.ok(await boton('Cambiar contraseña de Henry Administrador').isDisabled());
 await boton('Agregar trabajador').click();await page.getByLabel('Nombres y apellidos',{exact:true}).fill('Cocinero Uno');await page.getByLabel('Usuario de acceso',{exact:true}).fill('cook01');await page.getByLabel('Tipo de perfil',{exact:true}).selectOption('2');
 await page.getByText('Permisos de cocinero (1)',{exact:true}).click();await page.getByText('kds · operar',{exact:true}).waitFor();
 await page.getByLabel('Contraseña',{exact:true}).fill('ClaveLarga-Prueba-123');await page.getByLabel('Confirmar contraseña',{exact:true}).fill('OtraClave-Prueba-123');await boton('Crear trabajador').click();await page.getByRole('alert').filter({hasText:'debe coincidir'}).waitFor();
 await page.getByLabel('Confirmar contraseña',{exact:true}).fill('ClaveLarga-Prueba-123');await boton('Crear trabajador').click();await boton('Editar Cocinero Uno').waitFor();assert.equal(personas.length,2);
 await page.getByLabel('Buscar trabajador',{exact:true}).fill('cook01');await page.waitForFunction(()=>document.querySelectorAll('.vz-worker-card').length===1);
 await boton('Editar Cocinero Uno').click();await page.getByLabel('Tipo de perfil',{exact:true}).selectOption('3');await boton('Guardar cambios').click();await page.locator('.vz-worker-card').getByText('mesero',{exact:true}).waitFor();
 await boton('Cambiar contraseña de Cocinero Uno').click();await page.getByLabel('Contraseña',{exact:true}).fill('ClaveNueva-Prueba-123');await page.getByLabel('Confirmar contraseña',{exact:true}).fill('ClaveNueva-Prueba-123');await boton('Cambiar contraseña').click();await page.getByRole('status').filter({hasText:'Contraseña cambiada'}).waitFor();
 for(const width of [320,390,768,1366,1920])for(const tema of ['claro','oscuro']){
  await page.setViewportSize({width,height:1000});if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await boton(`Activar modo ${tema}`).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+width);
  await boton('Editar Cocinero Uno').click();assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),'Overflow modal '+width);
  if(process.argv[3]&&width===1366&&tema==='oscuro')await page.screenshot({path:process.argv[3]+'-formulario.png',animations:'disabled'});
  await boton('Cancelar').click();
 }
 await boton('Eliminar Cocinero Uno').click();await page.getByText(/Perderá el acceso y se cerrarán/).waitFor();await boton('Eliminar cuenta').click();await page.getByRole('heading',{name:'No hay trabajadores con estos filtros',exact:true}).waitFor();
 await page.getByLabel('Filtrar estado',{exact:true}).selectOption('cesado');await boton('Editar Cocinero Uno').waitFor();await boton('Editar Cocinero Uno').click();await page.getByLabel('Estado del trabajador',{exact:true}).selectOption('activo');await boton('Guardar cambios').click();await page.getByRole('heading',{name:'No hay trabajadores con estos filtros',exact:true}).waitFor();
 await page.getByLabel('Filtrar estado',{exact:true}).selectOption('vigentes');await page.getByLabel('Buscar trabajador',{exact:true}).fill('');await boton('Editar Henry Administrador').waitFor();
 if(process.argv[3]){await page.setViewportSize({width:1366,height:1000});await page.screenshot({path:process.argv[3]+'-equipo.png',animations:'disabled'});}
 assert.ok(!JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes('ClaveLarga-Prueba-123'));
 sesion=false;await page.goto('http://127.0.0.1:5173/login');await page.getByLabel('Usuario o correo electrónico',{exact:true}).fill('cook01');await page.getByLabel('Contraseña',{exact:true}).fill('ClaveLarga-Prueba-123');await boton('Ingresar').click();await page.waitForURL('**/inicio');
 assert.equal(comandos.at(-1).datos.email,'cook01');assert.equal(await page.getByRole('link',{name:'Mis trabajadores',exact:true}).count(),0);
 assert.deepEqual(errores,[]);console.log('OK: crear, perfil/permisos, contraseña, búsqueda, baja/reactivación, login por alias, cuenta propia protegida y responsive 320–1920 en ambos temas.');
}finally{await browser.close();}
