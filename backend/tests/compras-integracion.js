import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { writeFile,unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Usuario,Rol,AuthSesion,AutorizacionSensible,AuditLog,ProveedorMaestro,CompraFactura,CompraDetalle,
  InsumoAlmacen,UnidadMedida,InventarioKardex } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
assert.ok(env.entorno!=='production'&&['localhost','127.0.0.1','::1'].includes(env.database.host),'Solo MySQL local de desarrollo.');
const marca=randomUUID(),codigo=`f25-${marca.slice(0,8)}`,usuarios=[],insumos=[],unidades=[],hook=`fallo-${marca}`;
let proveedor,servidor,archivo;
const leer=async id=>(await InsumoAlmacen.findByPk(id)).toJSON();
try {
  const password=randomBytes(24).toString('hex'),hash=await crearHashPassword(password);
  for(const nombre of ['administrador','cajero']){const rol=await Rol.findOne({where:{nombre}});const u=await Usuario.create({nombre_completo:'Prueba temporal compras',email:`f25-${nombre}-${marca}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'});usuarios.push({id:u.id,email:u.email,password});}
  for(const [abreviatura,nombre] of [['kg','Kilogramo'],['un','Unidad']]) unidades.push(await UnidadMedida.create({nombre:`F25 ${nombre} ${marca}`,abreviatura}));
  servidor=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${servidor.address().port}/api`;
  async function pedir(ruta,method='GET',datos,cookie,csrf=true){const headers={};if(cookie)headers.Cookie=cookie;if(datos)headers['Content-Type']='application/json';if(csrf){headers.Origin=env.origenFrontend;headers['X-CSRF-Protection']='1';}
    const r=await fetch(base+ruta,{method,headers,body:datos?JSON.stringify(datos):undefined});return{status:r.status,json:await r.json(),headers:r.headers};}
  const cookies=[];
  for(const u of usuarios){const r=await pedir('/auth/login','POST',{email:u.email,password});assert.equal(r.status,200);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  const admin=cookies[0],get=r=>pedir(r,'GET',undefined,admin),post=(r,d)=>pedir(r,'POST',d,admin),put=(r,d)=>pedir(r,'PUT',d,admin);
  assert.equal((await pedir('/compras')).status,401);assert.equal((await pedir('/compras','GET',undefined,cookies[1])).status,403);
  assert.equal((await pedir('/compras','POST',{},admin,false)).status,403);
  for(const query of ['pagina=0','limite=51','pagina=1&pagina=2','estado=__proto__','otro=1'])assert.equal((await get(`/compras?${query}`)).status,400);
  const datosProveedor={razon_social:`Proveedor de prueba ${codigo}`,ruc:`20${String(BigInt('0x'+marca.replaceAll('-','').slice(0,12))%1000000000n).padStart(9,'0')}`,dias_credito:30};
  let r=await post('/compras/proveedores',datosProveedor);assert.equal(r.status,201);proveedor=r.json.proveedor;
  assert.equal((await post('/compras/proveedores',datosProveedor)).status,409);
  for(let n=0;n<2;n++) {const d={nombre:n?'Bebida de prueba F25':'Harina de prueba F25',codigo:`${codigo}-${n}`,unidad:n?'un':'kg',stock_minimo_alerta:'2'};r=await post('/compras/insumos',d);assert.equal(r.status,201);insumos.push({id:r.json.insumo.id,codigo:d.codigo});assert.equal((await leer(r.json.insumo.id)).stock_fisico,'0.0000');}
  assert.equal((await post('/compras/insumos',{nombre:'No crear',codigo:`${codigo}-ilegal`,unidad:'kg',stock_fisico:'10'})).status,400);
  const datos={proveedor_id:proveedor.id,numero_factura:`F25-${marca.slice(0,8)}`,fecha_emision:'2026-10-16',igv:'5.76',operacion_uid:`compra:${randomUUID()}`,
    lineas:insumos.map((i,n)=>({insumo_id:i.id,cantidad_base:n?'3':'2',costo_unitario:n?'4':'10'}))};
  r=await post('/compras',datos);assert.equal(r.status,201);let compra=r.json.compra;const original=compra.id;
  assert.equal(compra.total,'37.76');assert.equal((await leer(insumos[0].id)).stock_fisico,'0.0000');
  assert.equal(await InventarioKardex.count({where:{insumo_id:insumos.map(i=>i.id)}}),0);
  assert.equal((await post('/compras',datos)).json.compra.id,original);
  assert.equal((await post('/compras',{...datos,igv:'6'})).status,409);
  assert.equal((await post('/compras',{...datos,operacion_uid:`compra:${randomUUID()}`})).status,409);
  const altaConcurrente={...datos,numero_factura:`REINTENTO-${marca.slice(0,8)}`,operacion_uid:`compra:${randomUUID()}`};
  const altas=await Promise.all([post('/compras',altaConcurrente),post('/compras',altaConcurrente)]);
  assert.ok(altas.every(r=>r.status===201));assert.equal(altas[0].json.compra.id,altas[1].json.compra.id);
  const edicion={...datos,lineas:[{...datos.lineas[0],cantidad_base:'3'},datos.lineas[1]],revision:compra.revision};delete edicion.operacion_uid;
  r=await put(`/compras/${original}`,edicion);assert.equal(r.status,200);const obsoleta=compra.revision;compra=r.json.compra;
  assert.equal((await put(`/compras/${original}`,edicion)).status,409);
  assert.equal((await post(`/compras/${original}/confirmar`,{revision:obsoleta})).status,409);
  const confirmar=()=>post(`/compras/${original}/confirmar`,{revision:compra.revision});
  InventarioKardex.addHook('beforeCreate',hook,m=>{if(m.insumo_id===insumos[1].id&&m.tipo_transaccion==='INGRESO_COMPRA')throw new Error('FALLO_SEGUNDA_LINEA_COMPRA');});
  assert.equal((await confirmar()).status,500);InventarioKardex.removeHook('beforeCreate',hook);
  assert.equal((await leer(insumos[0].id)).stock_fisico,'0.0000');assert.equal((await get(`/compras/${original}`)).json.compra.estado_registro,'borrador');
  const carrera=await Promise.all([confirmar(),confirmar()]);assert.ok(carrera.every(r=>r.status===200));
  assert.equal((await leer(insumos[0].id)).stock_fisico,'3.0000');assert.equal((await leer(insumos[1].id)).stock_fisico,'3.0000');
  assert.equal(await InventarioKardex.count({where:{insumo_id:insumos.map(i=>i.id)}}),2);
  assert.equal((await put(`/compras/${original}`,{...edicion,revision:compra.revision})).status,409);
  assert.equal((await put(`/compras/proveedores/${proveedor.id}`,{...datosProveedor,ruc:'20111111111'})).status,409);
  console.log('OK: proveedores/insumos, validación, borrador sin stock, UID/factura duplicada, versión obsoleta, rollback multilínea y confirmación concurrente.');
  const segunda={...datos,numero_factura:`B25-${marca.slice(0,8)}`,igv:'0',operacion_uid:`compra:${randomUUID()}`,lineas:[{insumo_id:insumos[0].id,cantidad_base:'1',costo_unitario:'20'}]};
  r=await post('/compras',segunda);assert.equal(r.status,201);const b=r.json.compra;
  assert.equal((await post(`/compras/${b.id}/confirmar`,{revision:b.revision})).status,200);
  assert.equal((await leer(insumos[0].id)).costo_promedio,'12.5000');
  const entradaOriginal=await InventarioKardex.findOne({where:{operacion_uid:`mov:compra:${original}:insumo:${insumos[0].id}`}});assert.equal(entradaOriginal.costo_unitario_transaccion,'10.0000');
  const cuerpoComp={documento:`NC25-${marca.slice(0,8)}`,motivo:'Corrección completa de documento de prueba',revision:compra.revision,autorizacion_id:'1'};
  assert.equal((await post(`/compras/${original}/compensar`,cuerpoComp)).status,403);
  r=await post('/autorizaciones',{actorId:usuarios[0].id,accion:'compras/compensar',entidad:'compras_facturas',entidadId:original,motivo:cuerpoComp.motivo});assert.equal(r.status,201);cuerpoComp.autorizacion_id=r.json.autorizacion.id;
  await InsumoAlmacen.update({stock_reservado:'2.0000'},{where:{id:insumos[0].id}});
  assert.equal((await post(`/compras/${original}/compensar`,cuerpoComp)).status,409);
  assert.equal((await AutorizacionSensible.findByPk(cuerpoComp.autorizacion_id)).consumida_en,null);
  await InsumoAlmacen.update({stock_reservado:'0.0000'},{where:{id:insumos[0].id}});
  InventarioKardex.addHook('beforeCreate',hook,m=>{if(m.insumo_id===insumos[1].id&&m.tipo_transaccion==='SALIDA_AJUSTE')throw new Error('FALLO_COMPENSACION');});
  assert.equal((await post(`/compras/${original}/compensar`,cuerpoComp)).status,500);InventarioKardex.removeHook('beforeCreate',hook);
  assert.equal((await leer(insumos[0].id)).stock_fisico,'4.0000');assert.equal((await get(`/compras/${original}`)).json.compra.estado_registro,'confirmada');
  assert.equal((await AutorizacionSensible.findByPk(cuerpoComp.autorizacion_id)).consumida_en,null);
  const compensaciones=await Promise.all([post(`/compras/${original}/compensar`,cuerpoComp),post(`/compras/${original}/compensar`,cuerpoComp)]);
  assert.ok(compensaciones.every(r=>r.status===200));assert.equal(compensaciones[0].json.compra.id,compensaciones[1].json.compra.id);
  assert.equal((await leer(insumos[0].id)).stock_fisico,'1.0000');assert.equal((await leer(insumos[1].id)).stock_fisico,'0.0000');
  assert.equal((await leer(insumos[0].id)).costo_promedio,'12.5000');
  const despues=(await get(`/compras/${original}`)).json.compra;assert.equal(despues.lineas[0].cantidad_base,'3.0000');assert.equal(despues.lineas[0].costo_unitario,'10.0000');assert.equal(despues.estado_registro,'compensada');
  assert.equal(await InventarioKardex.count({where:{insumo_id:insumos.map(i=>i.id),tipo_transaccion:'SALIDA_AJUSTE'}}),2);
  assert.equal((await post(`/compras/${original}/compensar`,{...cuerpoComp,motivo:'Otro motivo'})).status,409);
  console.log('OK: promedio móvil, costos históricos, autorización atómica, disponible protegido y documento compensatorio separado e idempotente.');
  if(process.argv.includes('--vista')) {
    archivo=join(tmpdir(),`veneziana-f25-${marca}.json`);await writeFile(archivo,JSON.stringify({usuarios,proveedor,insumos,codigo,compra:b.id}));
    console.log(`VISTA_TEMPORAL: ${archivo}`);console.log('Enviar una línea para retirar los fixtures.');await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve)});process.stdin.pause();
  }
} catch(e){console.error('Fallo de compras:',e.message);process.exitCode=1;}
finally {
  InventarioKardex.removeHook('beforeCreate',hook);if(servidor)await new Promise(resolve=>servidor.close(resolve));
  await sequelize.transaction(async transaction=>{
    const compras=proveedor?await CompraFactura.findAll({where:{proveedor_id:proveedor.id},transaction}):[];
    if(insumos.length)await InventarioKardex.destroy({where:{insumo_id:insumos.map(i=>i.id)},transaction});
    for(const c of compras){await CompraDetalle.destroy({where:{compra_id:c.id},transaction});await c.destroy({transaction});}
    for(const i of insumos)await InsumoAlmacen.destroy({where:{id:i.id,codigo:i.codigo},transaction});
    if(proveedor)await ProveedorMaestro.destroy({where:{id:proveedor.id,ruc:proveedor.ruc},transaction});
    for(const u of unidades)await UnidadMedida.destroy({where:{id:u.id,nombre:u.nombre},transaction});
    for(const u of usuarios){await AuditLog.destroy({where:{usuario_id:u.id},transaction});await AutorizacionSensible.destroy({where:{actor_id:u.id},transaction});await AuthSesion.destroy({where:{usuario_id:u.id},transaction});await Usuario.destroy({where:{id:u.id,email:u.email},transaction});}
  });if(archivo)await unlink(archivo);await sequelize.close();console.log('Fixtures de compras retirados.');
}
