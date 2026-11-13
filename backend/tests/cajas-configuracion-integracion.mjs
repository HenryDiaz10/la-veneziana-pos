// Solo cuentas y cajas temporales. Nunca modifica turnos ni usuarios reales.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import app from '../src/app.js';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {crearHashPassword} from '../src/security/password.js';
import {consultarCaja,abrirCaja} from '../src/services/caja.service.js';
import {guardarConfiguracionCaja,listarConfiguracionCajas} from '../src/services/cajas-configuracion.service.js';
import {consultarResumenCaja,cerrarCaja} from '../src/services/caja-cierre.service.js';
const usuarios=[],cajas=[],marca=randomUUID().slice(0,8),pwd=randomBytes(20).toString('hex');let server;
const ctx=(i=0)=>({usuarioId:usuarios[i].id,clave:randomUUID()});
const rechaza=(f,codigo)=>assert.rejects(f,e=>e.codigo===codigo);
try{
  assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  const hash=await crearHashPassword(pwd);
  for(const [i,nombre] of ['administrador','cajero','cajero','cocinero'].entries()){
    const rol=await m.Rol.findOne({where:{nombre}});
    usuarios.push(await m.Usuario.create({nombre_completo:`Caja fixture ${i}`,email:`caja-${marca}-${i}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'}));
  }
  server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});const base=`http://127.0.0.1:${server.address().port}/api`;
  const pedir=async(ruta,{method='GET',body,cookie,key=randomUUID(),csrf=true}={})=>{const r=await fetch(base+ruta,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json',Origin:env.origenFrontend,'Idempotency-Key':key,...(csrf?{'X-CSRF-Protection':'1'}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  const login=async i=>(await pedir('/auth/login',{method:'POST',body:{email:usuarios[i].email,password:pwd}})).cookie;
  const admin=await login(0),cajero=await login(1),otro=await login(2);
  assert.equal((await pedir('/caja/configuracion')).status,401);
  assert.equal((await pedir('/caja/configuracion',{cookie:cajero})).status,403);
  const datos={nombre_terminal:`Prueba caja ${marca}`,ip_maquina:'127.0.0.1',estado:'activa',cajero_asignado_id:usuarios[1].id};
  assert.equal((await pedir('/caja/configuracion',{cookie:admin,method:'POST',body:datos,csrf:false})).status,403);
  const key=randomUUID(),r=await pedir('/caja/configuracion',{cookie:admin,method:'POST',body:datos,key});
  assert.equal(r.status,201,JSON.stringify(r.body));let caja=r.body.caja;cajas.push(caja.id);
  assert.equal((await pedir('/caja/configuracion',{cookie:admin,method:'POST',body:datos,key})).body.caja.id,caja.id);
  assert.equal((await pedir('/caja/configuracion',{cookie:cajero,method:'POST',body:datos})).status,403);
  await rechaza(()=>guardarConfiguracionCaja(null,datos,ctx()),'NOMBRE_CAJA_DUPLICADO');
  const lista=(await pedir('/caja/configuracion',{cookie:admin})).body;
  assert.ok(lista.cajeros.some(c=>c.id===usuarios[1].id));assert.ok(!lista.cajeros.some(c=>c.id===usuarios[3].id));
  assert.ok((await consultarCaja(usuarios[1].id)).cajas.some(c=>c.id===caja.id));
  assert.ok(!(await consultarCaja(usuarios[2].id)).cajas.some(c=>c.id===caja.id));
  const apertura={caja_fisica_id:caja.id,apertura_monto_base:'20.00'};
  assert.equal((await pedir('/caja/sesiones',{cookie:otro,method:'POST',body:apertura})).body.codigo,'CAJA_NO_ASIGNADA');
  await rechaza(()=>guardarConfiguracionCaja(caja.id,{...datos,version_config:0,cajero_asignado_id:usuarios[3].id},ctx()),'CAJERO_NO_HABILITADO');
  await rechaza(()=>guardarConfiguracionCaja(caja.id,{...datos,version_config:0},ctx(1)),'CONFIGURACION_CAJA_NO_AUTORIZADA');
  // Una carrera real de ediciones solo confirma una versión.
  const carreras=await Promise.allSettled([guardarConfiguracionCaja(caja.id,{...datos,version_config:0},ctx()),guardarConfiguracionCaja(caja.id,{...datos,version_config:0},ctx())]);
  assert.equal(carreras.filter(r=>r.status==='fulfilled').length,1);assert.equal(carreras.find(r=>r.status==='rejected').reason.codigo,'CONFIGURACION_CAJA_DESACTUALIZADA');
  caja=(await m.CajaFisica.findByPk(caja.id)).toJSON();
  const intento=ctx(1),turno=(await abrirCaja(apertura,intento)).sesion;
  assert.equal((await abrirCaja(apertura,intento)).sesion.id,turno.id);
  await rechaza(()=>guardarConfiguracionCaja(caja.id,{...datos,version_config:caja.version_config,cajero_asignado_id:usuarios[2].id},ctx()),'CAJA_EN_USO');
  assert.equal((await listarConfiguracionCajas()).cajas.find(c=>c.id===caja.id).sesion_abierta.id,turno.id);
  const resumen=await consultarResumenCaja(turno.id,ctx(1));
  await cerrarCaja(turno.id,{cierre_real_efectivo:'20.00',revision:resumen.revision},ctx(1));
  let guardado=await guardarConfiguracionCaja(caja.id,{...datos,version_config:caja.version_config,cajero_asignado_id:usuarios[2].id},ctx());caja=guardado.caja;
  assert.equal((await m.SesionCajaZ.findByPk(turno.id)).cajero_id,usuarios[1].id);
  assert.ok(!(await consultarCaja(usuarios[1].id)).cajas.some(c=>c.id===caja.id));
  assert.ok((await consultarCaja(usuarios[2].id)).cajas.some(c=>c.id===caja.id));
  guardado=await guardarConfiguracionCaja(caja.id,{...datos,version_config:caja.version_config,estado:'mantenimiento',cajero_asignado_id:usuarios[2].id},ctx());caja=guardado.caja;
  await rechaza(()=>abrirCaja(apertura,ctx(2)),'CAJA_NO_DISPONIBLE');
  guardado=await guardarConfiguracionCaja(caja.id,{...datos,version_config:caja.version_config,cajero_asignado_id:null},ctx());caja=guardado.caja;
  await rechaza(()=>abrirCaja(apertura,ctx(2)),'CAJA_NO_ASIGNADA');
  await guardarConfiguracionCaja(caja.id,{...datos,version_config:caja.version_config,cajero_asignado_id:usuarios[2].id},ctx());
  await usuarios[2].update({estado:'suspendido'});
  await rechaza(()=>guardarConfiguracionCaja(null,{...datos,nombre_terminal:`Otra ${marca}`,cajero_asignado_id:usuarios[2].id},ctx()),'CAJERO_NO_HABILITADO');
  assert.ok(!(await listarConfiguracionCajas()).cajeros.some(c=>c.id===usuarios[2].id));
  assert.ok((await m.AuditLog.count({where:{entidad_afectada:'cajas_fisicas',entidad_id:caja.id}}))>=4);
  console.log('OK: permisos HTTP/CSRF, alta y asignación, duplicados, elegibilidad, idempotencia, carrera de revisiones, caja ajena, turno abierto protegido, cierre, reasignación sin alterar historial y mantenimiento.');
}catch(e){console.error(e.stack??e);process.exitCode=1;}
finally{
  if(server)await new Promise(r=>server.close(r));const ids=usuarios.map(u=>u.id);
  if(ids.length){const jobs=await m.TrabajoImpresion.findAll({where:{solicitado_por:ids},attributes:['id']});if(jobs.length)await m.EventoOutbox.destroy({where:{entidad:'trabajos_impresion',entidad_id:jobs.map(j=>j.id)}});await m.TrabajoImpresion.destroy({where:{solicitado_por:ids}});await m.SesionCajaZ.destroy({where:{cajero_id:ids}});await m.AuditLog.destroy({where:{usuario_id:ids}});await m.IdempotenciaOperacion.destroy({where:{usuario_id:ids}});await m.AuthSesion.destroy({where:{usuario_id:ids}});}
  if(cajas.length)await m.CajaFisica.destroy({where:{id:cajas}});if(ids.length)await m.Usuario.destroy({where:{id:ids}});await sequelize.close();
}
