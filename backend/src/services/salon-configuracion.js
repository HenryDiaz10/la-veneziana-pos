import {createHash} from 'node:crypto';
import {Op} from 'sequelize';
import {ZonaRestaurante,MesaSalon,AuditLog} from '../models/index.js';
import {campos,texto,idEntero,exigirPedido as exigir} from './pedidos-calculo.js';
import {operacionComercial,auditoriaComercial,eventoComercial} from './operacion-comercial.js';
import {idMesa,CUENTAS_ACTIVAS} from './mesas-reglas.js';
import {marcaMesa,cuentaActivaMesa,presentarMesa} from './mesas.service.js';
export function presentarZona(z,marca=null){
  const datos={id:z.id,nombre:z.nombre,aforo_maximo:z.aforo_maximo};
  return {...datos,revision:createHash('sha256').update(JSON.stringify([datos,marca===null?null:String(marca)])).digest('hex')};
}
const revision=r=>exigir(typeof r==='string'&&/^[a-f0-9]{64}$/.test(r));
export function validarZona(datos,editar=false){
  campos(datos,['nombre','aforo_maximo',...(editar?['revision']:[])]);
  const nombre=texto(datos.nombre,50);exigir(nombre.length>=2);
  exigir(Number.isInteger(datos.aforo_maximo)&&datos.aforo_maximo>=0&&datos.aforo_maximo<=10000);
  if(editar)revision(datos.revision);
  return {nombre,aforo_maximo:datos.aforo_maximo,...(editar?{revision:datos.revision}:{})};
}
export function validarMesaConfiguracion(datos,editar=false){
  campos(datos,['zona_id','codigo_mesa','capacidad_sillas','posicion_x','posicion_y','habilitada',...(editar?['revision']:[])]);
  exigir(idEntero(datos.zona_id));const codigo=texto(datos.codigo_mesa,10).toUpperCase();exigir(/^[A-Z0-9][A-Z0-9-]{0,9}$/.test(codigo));
  exigir(Number.isInteger(datos.capacidad_sillas)&&datos.capacidad_sillas>=1&&datos.capacidad_sillas<=50);
  for(const n of [datos.posicion_x,datos.posicion_y])exigir(n===null||(Number.isInteger(n)&&n>=0&&n<=10000));
  exigir((datos.posicion_x===null)===(datos.posicion_y===null)&&typeof datos.habilitada==='boolean');
  if(editar)revision(datos.revision);
  return {...datos,codigo_mesa:codigo};
}
async function zonaBloqueada(id,tx){const z=await ZonaRestaurante.findByPk(idMesa(id),{transaction:tx,lock:tx.LOCK.UPDATE});exigir(z,'ZONA_INEXISTENTE');return z;}
async function marcaZona(id,tx){return (await AuditLog.findOne({where:{entidad_afectada:'zonas_restaurante',entidad_id:id},attributes:['id'],order:[['id','DESC']],transaction:tx}))?.id??null;}
async function aforo(z,adicional,excluir,tx){
  if(!z.aforo_maximo)return;
  const mesas=await MesaSalon.findAll({where:{zona_id:z.id,...(excluir?{id:{[Op.ne]:excluir}}:{})},attributes:['capacidad_sillas'],transaction:tx});
  exigir(mesas.reduce((n,m)=>n+(m.capacidad_sillas??0),adicional)<=z.aforo_maximo,'AFORO_ZONA_EXCEDIDO');
}
export function guardarZona(id,datos,contexto){
  const entrada=validarZona(datos,id!==null);if(id!==null)id=idMesa(id);
  return operacionComercial({...contexto,seguridad:true,tipo:id===null?'salon.zona.crear':'salon.zona.editar',cuerpo:{id,...entrada}},async tx=>{
    let z=id===null?null:await zonaBloqueada(id,tx);
    if(z)exigir(presentarZona(z,await marcaZona(z.id,tx)).revision===entrada.revision,'ZONA_DESACTUALIZADA');
    const repetida=await ZonaRestaurante.findOne({where:{nombre:entrada.nombre,...(id?{id:{[Op.ne]:id}}:{})},transaction:tx});exigir(!repetida,'ZONA_DUPLICADA');
    const valores={nombre:entrada.nombre,aforo_maximo:entrada.aforo_maximo};
    if(z){await aforo({id:z.id,aforo_maximo:entrada.aforo_maximo},0,null,tx);await z.update(valores,{transaction:tx});}
    else z=await ZonaRestaurante.create(valores,{transaction:tx});
    const a=await auditoriaComercial(contexto.usuarioId,'zonas_restaurante',z.id,valores,tx);
    return {zona:presentarZona(z,a.id)};
  });
}
export function eliminarZona(id,datos,contexto){
  id=idMesa(id);campos(datos,['revision']);revision(datos.revision);
  return operacionComercial({...contexto,seguridad:true,tipo:'salon.zona.eliminar',cuerpo:{id,...datos}},async tx=>{
    const z=await zonaBloqueada(id,tx);exigir(presentarZona(z,await marcaZona(id,tx)).revision===datos.revision,'ZONA_DESACTUALIZADA');
    exigir(!await MesaSalon.count({where:{zona_id:id},transaction:tx}),'ZONA_CON_MESAS');
    await auditoriaComercial(contexto.usuarioId,'zonas_restaurante',id,{accion:'eliminar',antes:{nombre:z.nombre,aforo_maximo:z.aforo_maximo}},tx);
    await z.destroy({transaction:tx});return {eliminada:true,zona_id:id};
  });
}
export function guardarMesaConfiguracion(id,datos,contexto){
  const entrada=validarMesaConfiguracion(datos,id!==null);if(id!==null)id=idMesa(id);
  return operacionComercial({...contexto,seguridad:true,tipo:id===null?'salon.mesa.crear':'salon.mesa.editar',cuerpo:{id,...entrada}},async tx=>{
    // Todas las configuraciones se serializan por rol; la mesa bloqueada también
    // protege frente a los comandos operativos y la apertura de cuentas.
    let mesa=id===null?null:await MesaSalon.findByPk(id,{transaction:tx,lock:tx.LOCK.UPDATE});
    exigir(id===null||mesa,'MESA_INEXISTENTE');
    if(mesa){
      const cuenta=await cuentaActivaMesa(id,tx);
      exigir(presentarMesa(mesa,cuenta,await marcaMesa(id,tx)).revision===entrada.revision,'MESA_DESACTUALIZADA');
      exigir(!cuenta,'MESA_CON_CUENTA_ACTIVA');
      exigir(['libre','inhabilitada'].includes(mesa.estado_actual)&&mesa.mesero_asignado_id===null,'MESA_EN_USO');
    }
    const zona=await zonaBloqueada(entrada.zona_id,tx);
    const repetida=await MesaSalon.findOne({where:{codigo_mesa:entrada.codigo_mesa,...(id?{id:{[Op.ne]:id}}:{})},transaction:tx});exigir(!repetida,'CODIGO_MESA_DUPLICADO');
    await aforo(zona,entrada.capacidad_sillas,id,tx);
    const valores={zona_id:zona.id,codigo_mesa:entrada.codigo_mesa,capacidad_sillas:entrada.capacidad_sillas,posicion_x:entrada.posicion_x,posicion_y:entrada.posicion_y,estado_actual:entrada.habilitada?'libre':'inhabilitada',mesero_asignado_id:null};
    const antes=mesa?presentarMesa(mesa):null;
    if(mesa)await mesa.update(valores,{transaction:tx});else mesa=await MesaSalon.create(valores,{transaction:tx});
    const audit=await auditoriaComercial(contexto.usuarioId,'mesas_salon',mesa.id,{accion:'configurar',antes,...valores},tx);
    await eventoComercial('mesa.configurada','mesas_salon',mesa.id,1,{version_esquema:1,mesa_id:mesa.id,cambio_id:String(audit.id)},tx);
    return {mesa:presentarMesa(mesa,null,audit.id)};
  });
}
