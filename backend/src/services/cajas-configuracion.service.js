import {isIP} from 'node:net';
import {Op} from 'sequelize';
import {sequelize} from '../config/database.js';
import {CajaFisica,Usuario,Rol,Permiso,SesionCajaZ} from '../models/index.js';
import {campos,texto,idEntero,exigirPedido as exigir} from './pedidos-calculo.js';
import {operacionComercial,auditoriaComercial} from './operacion-comercial.js';

const incluye=[{model:Rol,as:'rol',attributes:['id','nombre'],include:[{model:Permiso,as:'permisos',attributes:['modulo','accion'],through:{attributes:[]}}]}];
const tiene=(u,m,a)=>u?.estado==='activo'&&u.rol?.permisos.some(p=>p.modulo===m&&p.accion===a);
export const esCajeroHabilitado=u=>tiene(u,'caja','gestionar')&&tiene(u,'ventas','cobrar');
export async function comprobarCajero(id,tx) {
  const u=await Usuario.findByPk(id,{attributes:['id','estado','rol_id'],include:incluye,transaction:tx});
  exigir(esCajeroHabilitado(u),'CAJERO_NO_HABILITADO');
}
export function validarConfiguracionCaja(d,crear=false) {
  campos(d,['nombre_terminal','ip_maquina','estado','cajero_asignado_id',...(crear?[]:['version_config'])]);
  const nombre_terminal=texto(d.nombre_terminal,50),ip_maquina=d.ip_maquina==null||d.ip_maquina===''?null:texto(d.ip_maquina,45);
  exigir(nombre_terminal.length>=2&&(!ip_maquina||isIP(ip_maquina)>0));
  exigir(['activa','mantenimiento'].includes(d.estado));
  exigir(d.cajero_asignado_id===null||idEntero(d.cajero_asignado_id));
  if(!crear)exigir(Number.isSafeInteger(d.version_config)&&d.version_config>=0&&d.version_config<2147483647);
  return {nombre_terminal,ip_maquina,estado:d.estado,cajero_asignado_id:d.cajero_asignado_id,...(!crear?{version_config:d.version_config}:{})};
}
export async function listarConfiguracionCajas() {
  return sequelize.transaction(async tx=>{
    const [cajas,usuarios,sesiones]=await Promise.all([
      CajaFisica.findAll({order:[['id','ASC']],transaction:tx}),
      Usuario.findAll({attributes:['id','nombre_completo','usuario_acceso','email','estado','rol_id'],include:incluye,order:[['nombre_completo','ASC']],transaction:tx}),
      SesionCajaZ.findAll({where:{estado_sesion:'abierta'},attributes:['id','caja_fisica_id','cajero_id'],transaction:tx})
    ]);
    return {cajas:cajas.map(c=>({...c.toJSON(),sesion_abierta:sesiones.find(s=>s.caja_fisica_id===c.id)?.toJSON()??null,
      cajero:usuarios.find(u=>u.id===c.cajero_asignado_id)?{id:c.cajero_asignado_id,nombre:usuarios.find(u=>u.id===c.cajero_asignado_id).nombre_completo,habilitado:esCajeroHabilitado(usuarios.find(u=>u.id===c.cajero_asignado_id))}:null})),
      cajeros:usuarios.filter(esCajeroHabilitado).map(u=>({id:u.id,nombre:u.nombre_completo,usuario:u.usuario_acceso,email:u.email,perfil:u.rol.nombre}))};
  });
}
export function guardarConfiguracionCaja(id,datos,contexto) {
  exigir(id===null||idEntero(id));const entrada=validarConfiguracionCaja(datos,id===null);
  return operacionComercial({...contexto,seguridad:true,tipo:id===null?'caja.configurar.crear':'caja.configurar.editar',cuerpo:{id,...entrada}},async tx=>{
    // Revalidar al gestor bajo la misma barrera de cambios de roles/empleados.
    const actor=await Usuario.findByPk(contexto.usuarioId,{attributes:['id','estado','rol_id'],include:incluye,transaction:tx});
    exigir(tiene(actor,'seguridad','gestionar')&&tiene(actor,'caja','gestionar'),'CONFIGURACION_CAJA_NO_AUTORIZADA');
    const caja=id===null?null:await CajaFisica.findByPk(id,{transaction:tx,lock:tx.LOCK.UPDATE});
    if(id!==null){
      exigir(caja,'CAJA_FISICA_INEXISTENTE');
      exigir(caja.version_config===entrada.version_config,'CONFIGURACION_CAJA_DESACTUALIZADA');
      exigir(!await SesionCajaZ.findOne({where:{caja_fisica_id:id,estado_sesion:'abierta'},transaction:tx,lock:tx.LOCK.UPDATE}),'CAJA_EN_USO');
    }
    if(entrada.cajero_asignado_id!==null)await comprobarCajero(entrada.cajero_asignado_id,tx);
    exigir(!await CajaFisica.findOne({where:{nombre_terminal:entrada.nombre_terminal,...(id?{id:{[Op.ne]:id}}:{})},transaction:tx}),'NOMBRE_CAJA_DUPLICADO');
    const {version_config,...valores}=entrada;
    const guardada=caja?await caja.update({...valores,version_config:version_config+1},{transaction:tx}):await CajaFisica.create(valores,{transaction:tx});
    await auditoriaComercial(contexto.usuarioId,'cajas_fisicas',guardada.id,{...valores,version_config:guardada.version_config},tx);
    return {caja:guardada.toJSON()};
  });
}
