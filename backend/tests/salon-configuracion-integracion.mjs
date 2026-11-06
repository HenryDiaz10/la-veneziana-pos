import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import app from '../src/app.js';
import {sequelize} from '../src/config/database.js';
import {env} from '../src/config/env.js';
import * as m from '../src/models/index.js';
import {crearHashPassword} from '../src/security/password.js';
import {guardarZona,eliminarZona,guardarMesaConfiguracion,presentarZona} from '../src/services/salon-configuracion.js';
import {presentarMesa,marcaMesa} from '../src/services/mesas.service.js';
const usuarios=[],zonasHttp=[],marca=randomUUID();let tx,server;
const rechaza=(fn,codigo)=>assert.rejects(fn,e=>e.codigo===codigo);
try{
  assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  const password=randomBytes(24).toString('hex'),hash=await crearHashPassword(password);
  for(const nombre of ['administrador','mesero']){const rol=await m.Rol.findOne({where:{nombre}});usuarios.push(await m.Usuario.create({nombre_completo:'Fixture configuración salón',email:`cfg-${nombre}-${marca}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'}));}
  server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});const base=`http://127.0.0.1:${server.address().port}/api`,cookies=[];
  for(const u of usuarios){const r=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:env.origenFrontend,'X-CSRF-Protection':'1','Content-Type':'application/json'},body:JSON.stringify({email:u.email,password})});assert.equal(r.status,200);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  const pedir=async(ruta,datos,actor=0,csrf=true)=>{const r=await fetch(base+ruta,{method:'POST',headers:{Cookie:cookies[actor],Origin:env.origenFrontend,...(csrf?{'X-CSRF-Protection':'1'}:{}),'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(datos)});return {status:r.status,json:await r.json()};};
  const zHttp={nombre:`HTTP ${marca.slice(0,8)}`,aforo_maximo:0};
  assert.equal((await pedir('/salon/zonas',zHttp,1)).status,403);
  assert.equal((await pedir('/salon/mesas',{},1)).status,403);
  assert.equal((await pedir('/salon/zonas',zHttp,0,false)).status,403);
  const alta=await pedir('/salon/zonas',zHttp);assert.equal(alta.status,201);zonasHttp.push(alta.json.zona.id);
  tx=await sequelize.transaction();const ctx=(clave=randomUUID())=>({usuarioId:usuarios[0].id,clave,transaction:tx});
  const c=ctx(),datos={nombre:`Zona ${marca.slice(0,8)}`,aforo_maximo:8};
  const {zona:z}=await guardarZona(null,datos,c);assert.equal((await guardarZona(null,datos,c)).zona.id,z.id);
  await rechaza(()=>guardarZona(null,datos,ctx()),'ZONA_DUPLICADA');
  const mesaDatos={zona_id:z.id,codigo_mesa:`X${marca.slice(0,6)}`,capacidad_sillas:4,posicion_x:0,posicion_y:0,habilitada:true};
  const {mesa}=await guardarMesaConfiguracion(null,mesaDatos,ctx());
  await rechaza(()=>guardarMesaConfiguracion(null,mesaDatos,ctx()),'CODIGO_MESA_DUPLICADO');
  await rechaza(()=>guardarMesaConfiguracion(null,{...mesaDatos,codigo_mesa:`Y${marca.slice(0,6)}`,capacidad_sillas:5},ctx()),'AFORO_ZONA_EXCEDIDO');
  await rechaza(()=>guardarZona(z.id,{...datos,aforo_maximo:3,revision:z.revision},ctx()),'AFORO_ZONA_EXCEDIDO');
  await rechaza(()=>eliminarZona(z.id,{revision:z.revision},ctx()),'ZONA_CON_MESAS');
  const cambiado=await guardarMesaConfiguracion(mesa.id,{...mesaDatos,habilitada:false,revision:mesa.revision},ctx());assert.equal(cambiado.mesa.estado_actual,'inhabilitada');
  await rechaza(()=>guardarMesaConfiguracion(mesa.id,{...mesaDatos,revision:mesa.revision},ctx()),'MESA_DESACTUALIZADA');
  const libre=await guardarMesaConfiguracion(mesa.id,{...mesaDatos,revision:cambiado.mesa.revision},ctx());
  const modelo=await m.MesaSalon.findByPk(mesa.id,{transaction:tx});
  await modelo.update({estado_actual:'ocupada',mesero_asignado_id:usuarios[1].id},{transaction:tx});
  let actual=presentarMesa(modelo,null,await marcaMesa(mesa.id,tx));
  await rechaza(()=>guardarMesaConfiguracion(mesa.id,{...mesaDatos,revision:actual.revision},ctx()),'MESA_EN_USO');
  await modelo.update({estado_actual:'sucia_por_limpiar',mesero_asignado_id:null},{transaction:tx});actual=presentarMesa(modelo,null,await marcaMesa(mesa.id,tx));
  await rechaza(()=>guardarMesaConfiguracion(mesa.id,{...mesaDatos,revision:actual.revision},ctx()),'MESA_EN_USO');
  await modelo.update({estado_actual:'libre',mesero_asignado_id:null},{transaction:tx});
  const pedido=await m.PedidoMaster.create({codigo_pedido:`CF${marca.slice(0,10)}`,tipo_atencion:'salon',mesa_id:mesa.id,usuario_creador_id:usuarios[1].id,estado_cuenta:'abierta'},{transaction:tx});
  actual=presentarMesa(modelo,pedido,await marcaMesa(mesa.id,tx));
  await rechaza(()=>guardarMesaConfiguracion(mesa.id,{...mesaDatos,revision:actual.revision},ctx()),'MESA_CON_CUENTA_ACTIVA');
  const {zona:destino}=await guardarZona(null,{nombre:`Destino ${marca.slice(0,8)}`,aforo_maximo:4},ctx());
  await pedido.update({estado_cuenta:'pagada'},{transaction:tx});
  actual=presentarMesa(modelo,null,await marcaMesa(mesa.id,tx));
  await guardarMesaConfiguracion(mesa.id,{...mesaDatos,zona_id:destino.id,revision:actual.revision},ctx());
  assert.equal((await m.PedidoMaster.findByPk(pedido.id,{transaction:tx})).mesa_id,mesa.id,'Conservar historia al cambiar de zona');
  const editada=await guardarZona(z.id,{...datos,nombre:`Nombre nuevo ${marca.slice(0,8)}`,revision:z.revision},ctx());
  await rechaza(()=>guardarZona(z.id,{...datos,revision:z.revision},ctx()),'ZONA_DESACTUALIZADA');
  await eliminarZona(z.id,{revision:editada.zona.revision},ctx());assert.equal(await m.ZonaRestaurante.findByPk(z.id,{transaction:tx}),null);
  assert.ok(libre.mesa.revision);assert.ok(presentarZona(destino).revision);
  console.log('OK: permisos y CSRF, zonas y mesas, idempotencia, duplicados, aforo, revisiones, bloqueo de mesas en uso/cuenta activa, reubicación e historial. Rollback.');
}catch(e){console.error(e.name,e.codigo??e.message);process.exitCode=1;}
finally{
  if(tx&&!tx.finished)await tx.rollback();if(server)await new Promise(r=>server.close(r));
  const ids=usuarios.map(u=>u.id);
  if(ids.length){await m.AuthSesion.destroy({where:{usuario_id:ids}});await m.AuditLog.destroy({where:{usuario_id:ids}});await m.IdempotenciaOperacion.destroy({where:{usuario_id:ids}});await m.Usuario.destroy({where:{id:ids}});}
  if(zonasHttp.length)await m.ZonaRestaurante.destroy({where:{id:zonasHttp}});
  await sequelize.close();
}
