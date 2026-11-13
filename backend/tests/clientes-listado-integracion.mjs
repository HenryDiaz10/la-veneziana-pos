import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Usuario, Rol, AuthSesion, Cliente } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
assert.ok(env.entorno !== 'production' && ['127.0.0.1','localhost','::1'].includes(env.database.host), 'Prueba solo local.');
const usuarios=[], marca=randomUUID();let servidor,cliente;
try {
 const password=randomBytes(24).toString('hex'),hash=await crearHashPassword(password);
 for(const nombre of ['administrador','mesero','cajero','cocinero']){
  const rol=await Rol.findOne({where:{nombre}});
  const u=await Usuario.create({nombre_completo:`Prueba listado ${nombre}`,email:`listado-${nombre}-${marca}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'});
  usuarios.push(u);
 }
 cliente=await Cliente.create({nombres:'Cliente de prueba listado',tipo_documento:'PASAPORTE',numero_documento:'L'+marca.replaceAll('-','').slice(0,12).toUpperCase(),telefono_principal:'987654321'});
 servidor=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${servidor.address().port}/api`;
 async function pedir(ruta,cookie,datos){
  const r=await fetch(base+ruta,{method:datos?'POST':'GET',headers:{Origin:env.origenFrontend,'X-CSRF-Protection':'1',...(cookie?{Cookie:cookie}:{}),...(datos?{'Content-Type':'application/json'}:{})},body:datos?JSON.stringify(datos):undefined});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 assert.equal((await pedir('/clientes/listado')).status,401);
 for(const [i,u] of usuarios.entries()){
  const login=await pedir('/auth/login',null,{email:u.email,password});assert.equal(login.status,200);
  const r=await pedir('/clientes/listado?limite=1',login.cookie);
  if(i>0){assert.equal(r.status,403);continue;}
  assert.equal(r.status,200);assert.equal(r.body.clientes.length,1);
  assert.ok(r.body.paginacion.total>=1);
  const ultima=await pedir(`/clientes/listado?limite=1&pagina=${r.body.paginacion.totalPaginas}`,login.cookie);
  assert.equal(ultima.body.clientes[0].id,cliente.id);
  assert.deepEqual(Object.keys(ultima.body.clientes[0]).sort(),['id','nombres','apellidos','tipo_documento','numero_documento','telefono_principal'].sort());
  for(const query of ['pagina=0','pagina=10001','limite=21','limite=1&limite=2','documento=12345678'])assert.equal((await pedir('/clientes/listado?'+query,login.cookie)).status,400);
  assert.equal((await pedir('/clientes',login.cookie)).status,400);
  assert.equal((await pedir(`/clientes/${cliente.id}?documento=${cliente.numero_documento}`,login.cookie)).status,200);
 }
 console.log('OK: listado administrativo real paginado, datos mínimos, perfil, validaciones, 401 y 403 para otros roles.');
}finally{
 if(servidor)await new Promise(resolve=>servidor.close(resolve));
 if(cliente)await cliente.destroy();
 for(const u of usuarios){await AuthSesion.destroy({where:{usuario_id:u.id}});await u.destroy();}
 await sequelize.close();
}
