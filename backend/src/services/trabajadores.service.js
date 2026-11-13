import {createHash,createHmac} from 'node:crypto';
import {Op,fn,col,where} from 'sequelize';
import {sequelize} from '../config/database.js';
import {env} from '../config/env.js';
import {Usuario,Rol,Permiso,AuthSesion,AuditLog} from '../models/index.js';
import {campos,texto,idEntero,exigirPedido as exigir} from './pedidos-calculo.js';
import {operacionComercial} from './operacion-comercial.js';
import {crearHashPassword} from '../security/password.js';
import {validarRestablecimientoPassword} from '../validators/usuarios.js';
const CAMPOS=['id','nombre_completo','usuario_acceso','email','documento_identidad','fecha_contratacion','rol_id','estado','ultimo_acceso','updated_at'];
const estados=['activo','suspendido','cesado'];
const revisar=r=>exigir(typeof r==='string'&&/^[a-f0-9]{64}$/.test(r));
const opcional=(v,max)=>v===null||v===undefined||v===''?null:texto(v,max);
export function validarTrabajador(d,crear=false){
  campos(d,['nombre','usuario','email','documento','fecha_contratacion','rol_id','estado',crear?'password':'revision']);
  const nombre=texto(d.nombre,150),usuario=texto(d.usuario,40).toLowerCase(),email=opcional(d.email,100)?.toLowerCase()??null,documento=opcional(d.documento,20),fecha=opcional(d.fecha_contratacion,10);
  exigir(nombre.length>=2&&/^[a-z0-9][a-z0-9._-]{2,39}$/.test(usuario));
  exigir(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  exigir(!fecha||(/^\d{4}-\d{2}-\d{2}$/.test(fecha)&&Number.isFinite(Date.parse(fecha+'T00:00:00Z'))&&new Date(fecha+'T00:00:00Z').toISOString().slice(0,10)===fecha));
  exigir(idEntero(d.rol_id)&&estados.includes(d.estado));
  if(crear)exigir(validarRestablecimientoPassword({password:d.password}));else revisar(d.revision);
  return {nombre,usuario,email,documento,fecha_contratacion:fecha,rol_id:d.rol_id,estado:d.estado,...(crear?{password:d.password}:{revision:d.revision})};
}
const firmaPassword=password=>createHmac('sha256',env.secretoJwt).update(password).digest('hex');
async function marca(id,tx){return (await AuditLog.findOne({where:{entidad_afectada:'usuarios',entidad_id:id},attributes:['id'],order:[['id','DESC']],transaction:tx}))?.id??null;}
function presentar(u,rol,marcaAudit){
  const datos={id:u.id,nombre:u.nombre_completo,usuario:u.usuario_acceso,email:u.email,documento:u.documento_identidad,fecha_contratacion:u.fecha_contratacion,estado:u.estado,ultimo_acceso:u.ultimo_acceso,rol:{id:rol.id,nombre:rol.nombre}};
  const actualizado=u.updated_at?Math.floor(new Date(u.updated_at).getTime()/1000):null;
  return {...datos,revision:createHash('sha256').update(JSON.stringify([datos,actualizado,marcaAudit===null?null:String(marcaAudit)])).digest('hex')};
}
async function auditar(actor,id,accion,datos,tx){return AuditLog.create({usuario_id:actor,entidad_afectada:'usuarios',entidad_id:id,tipo_evento:accion==='crear'?'INSERT':'UPDATE',descripcion:`Administración de trabajador: ${accion}.`,datos_nuevos:datos},{transaction:tx});}
async function bloquear(id,tx){const u=await Usuario.findByPk(id,{attributes:CAMPOS,transaction:tx,lock:tx.LOCK.UPDATE});exigir(u,'TRABAJADOR_INEXISTENTE');return u;}
async function vigencia(u,revision,tx){exigir(presentar(u,await Rol.findByPk(u.rol_id,{transaction:tx}),await marca(u.id,tx)).revision===revision,'TRABAJADOR_DESACTUALIZADO');}
async function revocar(id,tx){await AuthSesion.update({revocada_en:new Date()},{where:{usuario_id:id,revocada_en:null},transaction:tx});}
async function verificarGestor(id,tx){
  // Revalidar también dentro de la barrera: el rol del actor pudo cambiar
  // después del middleware mientras esta solicitud esperaba una transacción.
  const actor=await Usuario.findByPk(id,{attributes:['rol_id','estado'],transaction:tx});
  exigir(actor?.estado==='activo','ACCESO_TRABAJADORES_REVOCADO');
  const rol=await Rol.findByPk(actor.rol_id,{include:[{model:Permiso,as:'permisos',attributes:['modulo','accion'],through:{attributes:[]}}],transaction:tx});
  exigir(rol?.permisos.some(p=>p.modulo==='seguridad'&&p.accion==='gestionar'),'ACCESO_TRABAJADORES_REVOCADO');
}
async function proteger(u,actor,rolId,estado,tx){
  exigir(u.id!==actor||(u.rol_id===rolId&&u.estado===estado),'CUENTA_PROPIA_PROTEGIDA');
  const admin=await Rol.findOne({where:{nombre:'administrador'},transaction:tx});
  if(u.rol_id===admin.id&&u.estado==='activo'&&(rolId!==admin.id||estado!=='activo'))exigir(await Usuario.count({where:{rol_id:admin.id,estado:'activo'},transaction:tx})>1,'ULTIMO_ADMINISTRADOR');
}
export async function listarTrabajadores(q){
  campos(q,['pagina','limite','busqueda','estado','rol_id']);
  const pagina=q.pagina??'1',limite=q.limite??'12',estado=q.estado??'todos',busqueda=texto(q.busqueda??'',100);
  exigir(typeof pagina==='string'&&/^[1-9]\d{0,4}$/.test(pagina)&&Number(pagina)<=10000&&typeof limite==='string'&&/^[1-9]\d?$/.test(limite)&&Number(limite)<=50);
  exigir(['todos','vigentes',...estados].includes(estado));exigir(q.rol_id===undefined||(typeof q.rol_id==='string'&&/^[1-9]\d{0,9}$/.test(q.rol_id)&&idEntero(Number(q.rol_id))));
  return sequelize.transaction(async tx=>{
    const filtro={...(estado==='vigentes'?{estado:{[Op.ne]:'cesado'}}:estado!=='todos'?{estado}:{}),...(q.rol_id?{rol_id:Number(q.rol_id)}:{}),...(busqueda?{[Op.or]:['nombre_completo','usuario_acceso','email','documento_identidad'].map(c=>where(fn('LOCATE',busqueda,col(c)),{[Op.gt]:0}))}:{})};
    const {rows,count}=await Usuario.findAndCountAll({where:filtro,attributes:CAMPOS,order:[['id','ASC']],limit:Number(limite),offset:(Number(pagina)-1)*Number(limite),transaction:tx});
    const roles=await Rol.findAll({attributes:['id','nombre'],transaction:tx});
    const usuarios=[];for(const u of rows)usuarios.push(presentar(u,roles.find(r=>r.id===u.rol_id),await marca(u.id,tx)));
    return {trabajadores:usuarios,paginacion:{pagina:Number(pagina),limite:Number(limite),total:count,totalPaginas:Math.ceil(count/Number(limite))}};
  });
}
export async function guardarTrabajador(id,datos,contexto){
  const entrada=validarTrabajador(datos,id===null);exigir(id===null||idEntero(id));
  const {password,revision,...publicos}=entrada;
  // Bcrypt fuera de la transacción; la idempotencia usa HMAC, nunca contraseña
  // ni hash bcrypt en respuestas, auditoría o cuerpos persistidos.
  const hash=id===null?await crearHashPassword(password):null;
  return operacionComercial({...contexto,seguridad:true,tipo:id===null?'trabajador.crear':'trabajador.editar',cuerpo:{id,...publicos,...(id===null?{firma_password:firmaPassword(password)}:{revision})}},async tx=>{
    await verificarGestor(contexto.usuarioId,tx);
    const rol=await Rol.findByPk(entrada.rol_id,{transaction:tx});exigir(rol,'ROL_TRABAJADOR_INEXISTENTE');
    let u=id===null?null:await bloquear(id,tx);
    if(u){await vigencia(u,revision,tx);await proteger(u,contexto.usuarioId,entrada.rol_id,entrada.estado,tx);}
    const unico=[{usuario_acceso:entrada.usuario},...(entrada.email?[{email:entrada.email}]:[]),...(entrada.documento?[{documento_identidad:entrada.documento}]:[])];
    exigir(!await Usuario.findOne({where:{[Op.or]:unico,...(id?{id:{[Op.ne]:id}}:{})},attributes:['id'],transaction:tx}),'IDENTIDAD_TRABAJADOR_DUPLICADA');
    const valores={nombre_completo:entrada.nombre,usuario_acceso:entrada.usuario,email:entrada.email,documento_identidad:entrada.documento,fecha_contratacion:entrada.fecha_contratacion,rol_id:rol.id,estado:entrada.estado};
    const cerrar=u&&(u.rol_id!==rol.id||u.estado!==entrada.estado||u.usuario_acceso!==entrada.usuario||u.email!==entrada.email);
    if(u)await u.update(valores,{transaction:tx});else u=await Usuario.create({...valores,password_hash:hash},{transaction:tx});
    if(cerrar)await revocar(u.id,tx);
    const a=await auditar(contexto.usuarioId,u.id,id===null?'crear':'editar',publicos,tx);
    return {trabajador:presentar(u,rol,a.id),sesiones_revocadas:Boolean(cerrar)};
  });
}
export async function cambiarPasswordTrabajador(id,datos,contexto){
  exigir(idEntero(id)&&id!==contexto.usuarioId,'CUENTA_PROPIA_PROTEGIDA');campos(datos,['revision','password']);revisar(datos.revision);exigir(validarRestablecimientoPassword({password:datos.password}));
  const hash=await crearHashPassword(datos.password);
  return operacionComercial({...contexto,seguridad:true,tipo:'trabajador.password',cuerpo:{id,revision:datos.revision,firma_password:firmaPassword(datos.password)}},async tx=>{
    await verificarGestor(contexto.usuarioId,tx);
    const u=await bloquear(id,tx);await vigencia(u,datos.revision,tx);
    await u.update({password_hash:hash,intentos_fallidos:0,bloqueado_hasta:null},{fields:['password_hash','intentos_fallidos','bloqueado_hasta'],transaction:tx});await revocar(id,tx);
    await auditar(contexto.usuarioId,id,'restablecer contraseña',{sesiones_revocadas:true},tx);return {restablecida:true};
  });
}
// Baja lógica: impedir acceso conservando autoría en ventas, caja y pedidos.
export function eliminarTrabajador(id,datos,contexto){
  exigir(idEntero(id));campos(datos,['revision']);revisar(datos.revision);
  return operacionComercial({...contexto,seguridad:true,tipo:'trabajador.eliminar',cuerpo:{id,revision:datos.revision}},async tx=>{
    await verificarGestor(contexto.usuarioId,tx);
    const u=await bloquear(id,tx);await vigencia(u,datos.revision,tx);await proteger(u,contexto.usuarioId,u.rol_id,'cesado',tx);
    await u.update({estado:'cesado'},{transaction:tx});await revocar(id,tx);await auditar(contexto.usuarioId,id,'dar de baja',{estado:'cesado',sesiones_revocadas:true},tx);
    return {eliminado:true,id,estado:'cesado'};
  });
}
