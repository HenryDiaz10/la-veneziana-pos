import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Usuario, Rol, AuthSesion } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { CONFIG_TOKEN, crearTokenAcceso, verificarTokenAcceso } from '../src/security/token.js';
import { NOMBRE_COOKIE_SESION } from '../src/security/cookies.js';
assert.ok(env.entorno !== 'production' && ['127.0.0.1','localhost','::1'].includes(env.database.host));
let usuario, servidor;
try {
  const rol = await Rol.findOne({where:{nombre:'cajero'}});
  usuario = await Usuario.create({nombre_completo:'Prueba temporal de renovación',email:`sesion-${randomUUID()}@example.invalid`,
    password_hash:await crearHashPassword(randomBytes(24).toString('hex')),rol_id:rol.id,estado:'activo'});
  servidor = await new Promise(resolve => { const s=app.listen(0,'127.0.0.1',()=>resolve(s)); });
  const origen=`http://127.0.0.1:${servidor.address().port}`;
  async function escenario({edadToken=840,edadSesion=840,dbFutura=false,duracionToken=900}={}) {
    const ahora=Math.floor(Date.now()/1000), uid=randomUUID();
    const token=jwt.sign({iat:ahora-edadToken},Buffer.from(env.secretoJwt,'hex'),{
      algorithm:CONFIG_TOKEN.algoritmo,issuer:CONFIG_TOKEN.emisor,audience:CONFIG_TOKEN.audiencia,
      subject:String(usuario.id),jwtid:uid,expiresIn:duracionToken});
    const fila=await AuthSesion.create({usuario_id:usuario.id,session_uid:uid,
      creado_en:new Date((ahora-edadSesion)*1000),expira_en:new Date((dbFutura?ahora+300:ahora-edadToken+duracionToken)*1000)});
    return {token,fila,cookie:`${NOMBRE_COOKIE_SESION}=${token}`};
  }
  async function pedir(cookie,ruta='/auth/session',metodo='GET') {
    return fetch(`${origen}/api${ruta}`,{method:metodo,headers:{Cookie:cookie,Origin:env.origenFrontend,'X-CSRF-Protection':'1'}});
  }
  if(process.argv.includes('--comprobar-servidor-actual')) {
    const prueba=await escenario();
    const actual=await fetch(`http://127.0.0.1:${env.puerto}/api/auth/session`,{headers:{Cookie:prueba.cookie,Origin:env.origenFrontend}});
    assert.equal(actual.status,200);
    assert.ok(actual.headers.get('set-cookie')?.includes('HttpOnly'),'El backend en ejecución debe tener cargada la renovación');
    const cookieActual=actual.headers.get('set-cookie').split(';')[0];
    const tokenActual=decodeURIComponent(cookieActual.slice(cookieActual.indexOf('=')+1));
    assert.equal(verificarTokenAcceso(tokenActual).expiraEn.getTime(),prueba.fila.creado_en.getTime()+8*3600000);
    console.log('OK: el backend que está ejecutándose aplica las ocho horas de sesión.');
  }
  const activa=await escenario();
  const r=await pedir(activa.cookie);
  assert.equal(r.status,200);
  const cabecera=r.headers.get('set-cookie');
  assert.ok(cabecera?.includes('HttpOnly')&&cabecera.includes('SameSite=Lax'));
  const cookieNueva=cabecera.split(';')[0];
  const tokenNuevo=decodeURIComponent(cookieNueva.slice(cookieNueva.indexOf('=')+1));
  const datos=verificarTokenAcceso(tokenNuevo);
  assert.equal(datos.sesionUid,activa.fila.session_uid);
  assert.equal(datos.expiraEn.getTime(),activa.fila.creado_en.getTime()+8*3600000);
  assert.ok(verificarTokenAcceso(crearTokenAcceso(usuario.id)).expiraEn.getTime()>Date.now()+8*3600000-2000);
  await activa.fila.reload();
  assert.equal(activa.fila.expira_en.getTime(),datos.expiraEn.getTime());
  assert.equal(await AuthSesion.count({where:{session_uid:datos.sesionUid}}),1);
  const concurrentes=await Promise.all(Array.from({length:5},()=>pedir(activa.cookie)));
  assert.ok(concurrentes.every(r=>r.status===200));
  await activa.fila.reload();
  assert.ok(activa.fila.expira_en.getTime()>=datos.expiraEn.getTime());
  assert.equal((await pedir(cookieNueva,'/auth/logout','POST')).status,204);
  for(const cookie of [activa.cookie,cookieNueva]) {
    const revocada=await pedir(cookie);
    assert.equal(revocada.status,401);
    assert.equal(revocada.headers.get('set-cookie'),null,'Un 401 antiguo no borra una cookie nueva');
  }
  const vencida=await escenario({edadToken:960,dbFutura:true});
  assert.equal((await pedir(vencida.cookie)).status,401,'No renovar JWT vencido aunque MySQL tenga otro plazo');
  const absoluta=await escenario({edadSesion:8*3600+10});
  assert.equal((await pedir(absoluta.cookie)).status,401,'El límite absoluto se impone incluso con JWT vigente');
  assert.equal((await pedir(absoluta.cookie,'/pos/catalogo')).status,401,'Todas las rutas aplican el límite absoluto');
  const cercaLimite=await escenario({edadToken:895,edadSesion:8*3600-25});
  const limite=await pedir(cercaLimite.cookie);
  assert.equal(limite.status,200);
  const t=decodeURIComponent(limite.headers.get('set-cookie').split(';')[0].split('=')[1]);
  assert.ok(verificarTokenAcceso(t).expiraEn.getTime()<=cercaLimite.fila.creado_en.getTime()+8*3600000);
  const reciente=await escenario({edadToken:0,edadSesion:0,duracionToken:CONFIG_TOKEN.duracionSegundos});
  assert.equal((await pedir(reciente.cookie)).headers.get('set-cookie'),null,'Sin escrituras innecesarias justo tras login');
  // Seis horas sin una sola renovación no invalidan una sesión de ocho horas.
  const inactiva=await escenario({edadToken:6*3600,edadSesion:6*3600,duracionToken:CONFIG_TOKEN.duracionSegundos});
  const despuesDeSeisHoras=await pedir(inactiva.cookie);
  assert.equal(despuesDeSeisHoras.status,200);
  assert.equal(despuesDeSeisHoras.headers.get('set-cookie'),null);
  assert.equal((await pedir(inactiva.cookie,'/pos/catalogo')).status,200);
  const original=AuthSesion.findOne;
  try {
    AuthSesion.findOne=async()=>{throw new Error('Fallo de base de datos simulado');};
    const fallo=await pedir(reciente.cookie);
    assert.equal(fallo.status,500);
    assert.equal(fallo.headers.get('set-cookie'),null);
  } finally { AuthSesion.findOne=original; }
  assert.equal((await pedir(reciente.cookie)).status,200,'La sesión sobrevive al fallo transitorio');
  await usuario.update({estado:'suspendido'});
  assert.equal((await pedir(reciente.cookie)).status,401,'Usuario desactivado sigue bloqueado');
  console.log('OK: sesión fija de ocho horas, seis horas sin interacción/renovación, adaptación de sesiones cortas, límite absoluto, concurrencia, revocación y error transitorio.');
} finally {
  if(servidor)await new Promise(resolve=>servidor.close(resolve));
  if(usuario){await AuthSesion.destroy({where:{usuario_id:usuario.id}});await usuario.destroy();}
  await sequelize.close();
}
