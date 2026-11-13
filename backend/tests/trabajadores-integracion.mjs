import assert from 'node:assert/strict';import {randomUUID,randomBytes} from 'node:crypto';
import app from '../src/app.js';import {env} from '../src/config/env.js';import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';import {crearHashPassword} from '../src/security/password.js';
const ids=[],marca=randomUUID().slice(0,8),password=randomBytes(20).toString('hex'),nueva=randomBytes(20).toString('hex');let server;
try{
 assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
 const roles=await m.Rol.findAll({attributes:['id','nombre']});const admin=roles.find(r=>r.nombre==='administrador'),cocinero=roles.find(r=>r.nombre==='cocinero'),mesero=roles.find(r=>r.nombre==='mesero');
 const hash=await crearHashPassword(password);
 const a=await m.Usuario.create({nombre_completo:'Fixture administrador trabajadores',usuario_acceso:`adm${marca}`,email:`adm-${marca}@example.invalid`,password_hash:hash,rol_id:admin.id,estado:'activo'});ids.push(a.id);
 server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});const base=`http://127.0.0.1:${server.address().port}/api`;
 const pedir=async(ruta,{cookie,method='GET',body,key=randomUUID(),csrf=true}={})=>{const r=await fetch(base+ruta,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json','Idempotency-Key':key,Origin:env.origenFrontend,...(csrf?{'X-CSRF-Protection':'1'}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,json:r.status===204?null:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const login=(email,password)=>pedir('/auth/login',{method:'POST',body:{email,password}});
 const auth=await login(a.email,password);assert.equal(auth.status,200);const cookie=auth.cookie;
 assert.equal((await pedir('/trabajadores')).status,401);
 const entrada={nombre:'Cocinero de prueba',usuario:`cook${marca}`,email:null,documento:null,fecha_contratacion:'2026-11-06',rol_id:cocinero.id,estado:'activo',password};
 assert.equal((await pedir('/trabajadores',{cookie,method:'POST',body:entrada,csrf:false})).status,403);
 const key=randomUUID(),alta=await pedir('/trabajadores',{cookie,method:'POST',body:entrada,key});assert.equal(alta.status,201,JSON.stringify(alta.json));const id=alta.json.trabajador.id;ids.push(id);
 assert.equal((await pedir('/trabajadores',{cookie,method:'POST',body:entrada,key})).json.trabajador.id,id);
 assert.equal((await pedir('/trabajadores',{cookie,method:'POST',body:entrada})).status,409);
 let acceso=await login(entrada.usuario.toUpperCase(),password);assert.equal(acceso.status,200);assert.equal(acceso.json.usuario.rol.nombre,'cocinero');assert.ok(acceso.json.usuario.permisos.some(p=>p.modulo==='kds'&&p.accion==='operar'));
 assert.equal((await pedir('/trabajadores',{cookie:acceso.cookie})).status,403);
 assert.equal((await pedir('/trabajadores',{cookie:acceso.cookie,method:'POST',body:entrada})).status,403);
 async function leer(){const r=await pedir(`/trabajadores?busqueda=${marca}&estado=todos`,{cookie});assert.equal(r.status,200);return r.json.trabajadores.find(u=>u.id===id);}
 const datos=u=>({nombre:u.nombre,usuario:u.usuario,email:u.email,documento:u.documento,fecha_contratacion:u.fecha_contratacion,rol_id:u.rol.id,estado:u.estado,revision:u.revision});
 let u=await leer();let r=await pedir(`/trabajadores/${id}`,{cookie,method:'PATCH',body:{...datos(u),nombre:'Nombre corregido'}});assert.equal(r.status,200,JSON.stringify(r.json));
 assert.equal((await pedir(`/trabajadores/${id}`,{cookie,method:'PATCH',body:datos(u)})).status,409);
 u=await leer();r=await pedir(`/trabajadores/${id}`,{cookie,method:'PATCH',body:{...datos(u),rol_id:mesero.id}});assert.equal(r.status,200);assert.equal(r.json.sesiones_revocadas,true);
 assert.equal((await pedir('/auth/session',{cookie:acceso.cookie})).status,401);
 acceso=await login(entrada.usuario,password);assert.equal(acceso.json.usuario.rol.nombre,'mesero');
 u=await leer();r=await pedir(`/trabajadores/${id}/password`,{cookie,method:'POST',body:{revision:u.revision,password:nueva}});assert.equal(r.status,200);
 assert.equal((await pedir('/auth/session',{cookie:acceso.cookie})).status,401);
 assert.equal((await login(entrada.usuario,password)).status,401);acceso=await login(entrada.usuario,nueva);assert.equal(acceso.status,200);
 u=await leer();r=await pedir(`/trabajadores/${id}`,{cookie,method:'PATCH',body:{...datos(u),usuario:`nuevo${marca}`}});assert.equal(r.status,200);
 assert.equal((await pedir('/auth/session',{cookie:acceso.cookie})).status,401);assert.equal((await login(entrada.usuario,nueva)).status,401);
 acceso=await login(`nuevo${marca}`,nueva);assert.equal(acceso.status,200);
 u=await leer();r=await pedir(`/trabajadores/${id}`,{cookie,method:'DELETE',body:{revision:u.revision}});assert.equal(r.status,200);assert.equal((await m.Usuario.findByPk(id)).estado,'cesado');
 assert.equal((await pedir('/auth/session',{cookie:acceso.cookie})).status,401);assert.equal((await login(`nuevo${marca}`,nueva)).status,401);
 assert.equal((await pedir(`/trabajadores?estado=vigentes&busqueda=nuevo${marca}`,{cookie})).json.paginacion.total,0);
 u=await leer();r=await pedir(`/trabajadores/${id}`,{cookie,method:'PATCH',body:{...datos(u),estado:'activo'}});assert.equal(r.status,200);assert.equal((await login(`nuevo${marca}`,nueva)).status,200);
 const propio=(await pedir(`/trabajadores?busqueda=adm${marca}`,{cookie})).json.trabajadores.find(u=>u.id===a.id);
 assert.equal((await pedir(`/trabajadores/${a.id}`,{cookie,method:'DELETE',body:{revision:propio.revision}})).json.codigo,'CUENTA_PROPIA_PROTEGIDA');
 assert.equal((await pedir(`/trabajadores/${a.id}`,{cookie,method:'PATCH',body:{...datos(propio),rol_id:mesero.id}})).json.codigo,'CUENTA_PROPIA_PROTEGIDA');
 const secretos=JSON.stringify([alta.json,await leer(),await m.AuditLog.findAll({where:{usuario_id:a.id},raw:true}),await m.IdempotenciaOperacion.findAll({where:{usuario_id:a.id},raw:true})]);
 assert.ok(!secretos.includes(password)&&!secretos.includes(nueva)&&!secretos.includes('password_hash')&&!secretos.includes('$2b$'));
 console.log('OK: alta idempotente, alias/correo, contraseña bcrypt sin exposición, perfiles reales, revisión, baja/reactivación, sesiones revocadas y permisos/CSRF.');
}catch(e){console.error(e.name,e.codigo??e.message);process.exitCode=1;}
finally{
 if(server)await new Promise(r=>server.close(r));
 if(ids.length){await m.AuthSesion.destroy({where:{usuario_id:ids}});await m.AuditLog.destroy({where:{usuario_id:ids}});await m.IdempotenciaOperacion.destroy({where:{usuario_id:ids}});await m.Usuario.destroy({where:{id:ids}});}
 await sequelize.close();
}
