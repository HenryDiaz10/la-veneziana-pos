import { Op, fn, col, where, Transaction } from 'sequelize';
import { createHash } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { CompraFactura, CompraDetalle, ProveedorMaestro, InsumoAlmacen, UnidadMedida, AuditLog, InventarioKardex, Rol } from '../models/index.js';
import { registrarMovimiento } from './inventario.service.js';
import { consumirAutorizacion } from './autorizaciones.service.js';
import { ErrorInventario, idInsumoValido } from './inventario-calculo.js';
import { validarCompra, validarProveedor, validarAltaInsumo, textoCompra, objetoCompra } from '../validators/compras.js';
const exigir = (c, codigo) => { if (!c) throw new ErrorInventario(codigo); };
const UID = /^compra:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const PROVEEDOR = ['id','razon_social','ruc','telefono_contacto','correo_contacto','dias_credito','estado'];
async function tx(operacion) {
  for (let n=0;;n++) try { return await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, operacion); }
  catch (e) { if (e.original?.code === 'ER_LOCK_DEADLOCK' && n<2) continue;
    if (e.name === 'SequelizeUniqueConstraintError') throw new ErrorInventario('DOCUMENTO_DUPLICADO'); throw e; }
}
function parametros({ pagina=1, limite=20, busqueda='' }={}) {
  exigir(Number.isInteger(pagina)&&pagina>0&&pagina<=10000&&Number.isInteger(limite)&&limite>0&&limite<=50&&typeof busqueda==='string'&&[...busqueda].length<=150&&!/[\u0000-\u001f\u007f-\u009f]/.test(busqueda),'DATOS_INVALIDOS');
  return { pagina, limite, busqueda: busqueda.trim() };
}
const paginacion = (p,total) => ({ ...p, busqueda: undefined, total, totalPaginas: Math.ceil(total/p.limite) });
const buscar = (campos, texto) => texto ? { [Op.or]: campos.map(c => where(fn('LOCATE',texto,col(c)),{[Op.gt]:0})) } : {};
async function auditoria(entidad,id,actor,antes,despues,descripcion,transaction) {
  await AuditLog.create({ entidad_afectada: entidad, entidad_id: id, usuario_id: actor, tipo_evento: antes?'UPDATE':'INSERT',
    datos_anteriores: antes, datos_nuevos: despues, descripcion },{transaction});
}
export async function listarProveedores(opciones) {
  const p=parametros(opciones), { count,rows }=await ProveedorMaestro.findAndCountAll({ where: buscar(['razon_social','ruc'],p.busqueda),attributes:PROVEEDOR,order:[['id','ASC']],limit:p.limite,offset:(p.pagina-1)*p.limite });
  return { proveedores:rows,paginacion:paginacion(p,count) };
}
export function guardarProveedor(id,datos,actor) {
  const entrada=validarProveedor(datos); exigir(id===null||idInsumoValido(id),'DATOS_INVALIDOS');
  return tx(async transaction=>{
    let p=id===null?null:await ProveedorMaestro.findByPk(id,{attributes:PROVEEDOR,transaction,lock:transaction.LOCK.UPDATE});
    exigir(id===null||p,'PROVEEDOR_INEXISTENTE'); const antes=p?.toJSON()??null;
    if(p&&p.ruc!==entrada.ruc) exigir(!await CompraFactura.count({where:{proveedor_id:p.id},transaction}),'PROVEEDOR_CON_DOCUMENTOS');
    if(p) await p.update(entrada,{transaction}); else p=await ProveedorMaestro.create(entrada,{transaction});
    await auditoria('proveedores_maestro',p.id,actor,antes,entrada,'Registro de proveedor',transaction);
    return { proveedor: Object.fromEntries(PROVEEDOR.map(c=>[c,p.get(c)])) };
  });
}
export function crearInsumoCompra(datos,actor) {
  const entrada=validarAltaInsumo(datos);
  return tx(async transaction=>{
    // Serializar el alta de unidades canónicas, sin permitir saldos iniciales.
    await Rol.findOne({where:{nombre:'administrador'},transaction,lock:transaction.LOCK.UPDATE});
    let unidad=await UnidadMedida.findOne({where:{abreviatura:entrada.unidad},order:[['id','ASC']],transaction,lock:transaction.LOCK.UPDATE});
    if(!unidad) unidad=await UnidadMedida.create({nombre:{kg:'Kilogramo',L:'Litro',un:'Unidad'}[entrada.unidad],abreviatura:entrada.unidad},{transaction});
    const {unidad:omitida,...valores}=entrada; void omitida;
    const i=await InsumoAlmacen.create({...valores,unidad_medida_id:unidad.id},{transaction});
    await auditoria('insumos_almacen',i.id,actor,null,{...valores,unidad_medida_id:unidad.id},'Alta de insumo sin saldo inicial',transaction);
    return { insumo:{id:i.id,...valores,unidad:unidad.abreviatura} };
  });
}
async function lineasCompra(c,transaction) {
  return CompraDetalle.findAll({where:{compra_id:c.id},order:[['insumo_id','ASC']],transaction});
}
const identidad = (c,lineas) => ({proveedor_id:c.proveedor_id,numero_factura:c.numero_factura,fecha_emision:c.fecha_emision,
  fecha_vencimiento:c.fecha_vencimiento,subtotal:c.subtotal,igv:c.igv,total:c.total,
  lineas:lineas.map(l=>({insumo_id:l.insumo_id,cantidad_base:l.cantidad_base,costo_unitario:l.costo_unitario,subtotal:l.subtotal}))});
const huella = contenido => createHash('sha256').update(JSON.stringify(contenido)).digest('hex');
async function serializar(c,transaction) {
  const lineas=await lineasCompra(c,transaction);
  const insumos=await InsumoAlmacen.findAll({where:{id:lineas.map(l=>l.insumo_id)},attributes:['id','nombre','unidad_medida_id'],transaction});
  const unidades=await UnidadMedida.findAll({where:{id:insumos.map(i=>i.unidad_medida_id)},transaction});
  const proveedor=await ProveedorMaestro.findByPk(c.proveedor_id,{attributes:PROVEEDOR,transaction});
  const movimientos=await InventarioKardex.findAll({where:{referencia_documento:`compra:${c.id}`},attributes:['id','insumo_id','cantidad','saldo_posterior'],order:[['id','ASC']],transaction});
  const compensacion=await CompraFactura.findOne({where:{operacion_uid:`compensacion:${c.id}`},transaction});
  const origen=c.operacion_uid?.startsWith('compensacion:')?Number(c.operacion_uid.split(':')[1]):null;
  return {compra:{...c.toJSON(),tipo_documento:origen?'compensacion':'compra',compra_origen_id:origen,revision:huella(identidad(c,lineas)),proveedor,
    lineas:lineas.map(l=>{const i=insumos.find(i=>i.id===l.insumo_id);return {...l.toJSON(),nombre_insumo:i?.nombre,unidad:unidades.find(u=>u.id===i?.unidad_medida_id)?.abreviatura};}),
    movimientos,compensacion_id:compensacion?.id??null}};
}
export function consultarCompra(id) {
  exigir(idInsumoValido(id),'DATOS_INVALIDOS');
  return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async transaction=>{
    const c=await CompraFactura.findByPk(id,{transaction}); exigir(c,'COMPRA_INEXISTENTE'); return serializar(c,transaction);
  });
}
export async function listarCompras(opciones) {
  const p=parametros(opciones); const estado=opciones?.estado??'todos'; exigir(['todos','borrador','confirmada','compensada'].includes(estado),'DATOS_INVALIDOS');
  const filtro={...buscar(['numero_factura'],p.busqueda),...(estado==='todos'?{}:{estado_registro:estado})};
  return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async transaction=>{
    const {count,rows}=await CompraFactura.findAndCountAll({where:filtro,order:[['id','DESC']],limit:p.limite,offset:(p.pagina-1)*p.limite,transaction});
    const proveedores=await ProveedorMaestro.findAll({where:{id:rows.map(c=>c.proveedor_id)},attributes:['id','razon_social'],transaction});
    return {compras:rows.map(c=>({...c.toJSON(),razon_social:proveedores.find(p=>p.id===c.proveedor_id)?.razon_social,tipo_documento:c.operacion_uid?.startsWith('compensacion:')?'compensacion':'compra'})),paginacion:paginacion(p,count)};
  });
}
async function proveedorActivo(id,transaction) {
  const p=await ProveedorMaestro.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
  exigir(p,'PROVEEDOR_INEXISTENTE'); exigir(p.estado==='activo','PROVEEDOR_INACTIVO');
}
async function validarInsumos(lineas,transaction) {
  for(const l of lineas) {
    const i=await InsumoAlmacen.findByPk(l.insumo_id,{transaction,lock:transaction.LOCK.UPDATE});
    exigir(i?.activo===true,'INSUMO_NO_DISPONIBLE');
    const u=await UnidadMedida.findByPk(i.unidad_medida_id,{transaction,lock:transaction.LOCK.SHARE});
    exigir(['kg','l','un'].includes(u?.abreviatura?.toLowerCase()),'UNIDAD_CAMBIADA');
  }
}
export function guardarCompra(id,datos,actor) {
  const entrada=validarCompra(datos); exigir(id===null||idInsumoValido(id),'DATOS_INVALIDOS');
  exigir(id===null?UID.test(datos.operacion_uid??''):typeof datos.revision==='string','DATOS_INVALIDOS');
  return tx(async transaction=>{
    let c=id===null?await CompraFactura.findOne({where:{operacion_uid:datos.operacion_uid},transaction,lock:transaction.LOCK.UPDATE}):await CompraFactura.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
    if(id===null&&c) {exigir(c.usuario_registro_id===actor&&huella(identidad(c,await lineasCompra(c,transaction)))===huella(entrada),'OPERACION_EN_CONFLICTO');return serializar(c,transaction);}
    exigir(id===null||c,'COMPRA_INEXISTENTE');
    if(c) {exigir(c.estado_registro==='borrador','COMPRA_INMUTABLE');exigir(huella(identidad(c,await lineasCompra(c,transaction)))===datos.revision,'COMPRA_DESACTUALIZADA');}
    await proveedorActivo(entrada.proveedor_id,transaction); await validarInsumos(entrada.lineas,transaction);
    const {lineas,...cabecera}=entrada, antes=c?.toJSON()??null;
    if(c) {await c.update(cabecera,{transaction});await CompraDetalle.destroy({where:{compra_id:c.id},transaction});}
    else c=await CompraFactura.create({...cabecera,usuario_registro_id:actor,operacion_uid:datos.operacion_uid},{transaction});
    await CompraDetalle.bulkCreate(lineas.map(l=>({...l,compra_id:c.id})),{transaction});
    await auditoria('compras_facturas',c.id,actor,antes,entrada,'Compra guardada como borrador; sin ingreso de stock',transaction);
    return serializar(c,transaction);
  }).catch(async error=>{
    // Dos altas con el mismo UID pueden competir antes de que exista la fila.
    // Tras el rollback de la perdedora, devolver la operación ya confirmada.
    if(id===null&&error.codigo==='DOCUMENTO_DUPLICADO') {
      const anterior=await CompraFactura.findOne({where:{operacion_uid:datos.operacion_uid}});
      if(anterior) {
        const resultado=await consultarCompra(anterior.id),c=resultado.compra;
        exigir(c.usuario_registro_id===actor&&huella(identidad(c,c.lineas))===huella(entrada),'OPERACION_EN_CONFLICTO');
        return resultado;
      }
    }
    throw error;
  });
}
export function confirmarCompra(id,datos,actor) {
  exigir(idInsumoValido(id)&&objetoCompra(datos,['revision'])&&typeof datos.revision==='string','DATOS_INVALIDOS');
  return tx(async transaction=>{
    const c=await CompraFactura.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); exigir(c,'COMPRA_INEXISTENTE');
    const lineas=await lineasCompra(c,transaction); exigir(huella(identidad(c,lineas))===datos.revision,'COMPRA_DESACTUALIZADA');
    exigir(!c.operacion_uid?.startsWith('compensacion:')&&c.estado_registro!=='compensada','COMPRA_INMUTABLE');
    if(c.estado_registro==='confirmada') return serializar(c,transaction);
    await proveedorActivo(c.proveedor_id,transaction); await validarInsumos(lineas,transaction);
    exigir(lineas.length>0,'DATOS_INVALIDOS');
    for(const l of lineas) await registrarMovimiento({insumo_id:l.insumo_id,tipo_transaccion:'INGRESO_COMPRA',cantidad:l.cantidad_base,costo_unitario:l.costo_unitario,
      operacion_uid:`mov:compra:${c.id}:insumo:${l.insumo_id}`,usuario_id:actor,referencia_documento:`compra:${c.id}`},{transaction});
    await c.update({estado_registro:'confirmada'},{transaction});
    await auditoria('compras_facturas',c.id,actor,{estado_registro:'borrador'},{estado_registro:'confirmada'},'Confirmación de compra e ingreso de almacén',transaction);
    return serializar(c,transaction);
  });
}
export function compensarCompra(id,datos,actor) {
  exigir(idInsumoValido(id)&&objetoCompra(datos,['documento','motivo','autorizacion_id','revision']),'DATOS_INVALIDOS');
  const documento=textoCompra(datos.documento,50).toUpperCase(),motivo=textoCompra(datos.motivo,180);
  exigir(/^[A-Z0-9][A-Z0-9/-]*$/.test(documento)&&typeof datos.autorizacion_id==='string'&&typeof datos.revision==='string','DATOS_INVALIDOS');
  return tx(async transaction=>{
    // Mismo orden de la autorización sensible: rol, autorización/actores, compra, insumos.
    await Rol.findOne({where:{nombre:'administrador'},transaction,lock:transaction.LOCK.UPDATE});
    const anterior=await CompraFactura.findOne({where:{operacion_uid:`compensacion:${id}`},transaction,lock:transaction.LOCK.UPDATE});
    if(anterior) {
      exigir(anterior.numero_factura===documento&&anterior.usuario_registro_id===actor,'OPERACION_EN_CONFLICTO');
      const registro=await AuditLog.findOne({where:{entidad_afectada:'compras_compensaciones',entidad_id:anterior.id},transaction});
      exigir(registro?.datos_nuevos?.motivo===motivo&&registro?.datos_nuevos?.revision===datos.revision,'OPERACION_EN_CONFLICTO');
      return serializar(anterior,transaction);
    }
    const aprobacion=await consumirAutorizacion({autorizacionId:datos.autorizacion_id,actorId:actor,accion:'compras/compensar',entidad:'compras_facturas',entidadId:id,transaction});
    const c=await CompraFactura.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE}); exigir(c,'COMPRA_INEXISTENTE');
    exigir(c.estado_registro==='confirmada'&&!c.operacion_uid?.startsWith('compensacion:'),'COMPRA_INMUTABLE');
    const lineas=await lineasCompra(c,transaction); exigir(huella(identidad(c,lineas))===datos.revision,'COMPRA_DESACTUALIZADA');
    for(const l of lineas) {
      const origen=await InventarioKardex.findOne({where:{operacion_uid:`mov:compra:${id}:insumo:${l.insumo_id}`},transaction});
      exigir(origen?.tipo_transaccion==='INGRESO_COMPRA'&&origen.insumo_id===l.insumo_id&&origen.cantidad===l.cantidad_base&&origen.costo_unitario_transaccion===l.costo_unitario,'COMPRA_SIN_INGRESO');
    }
    // Documento separado; las cantidades y precios de la factura permanecen intactos.
    const nota=await CompraFactura.create({proveedor_id:c.proveedor_id,usuario_registro_id:actor,numero_factura:documento,
      fecha_emision:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
      subtotal:c.subtotal,igv:c.igv,total:c.total,estado_registro:'compensada',operacion_uid:`compensacion:${id}`},{transaction});
    await CompraDetalle.bulkCreate(lineas.map(l=>({compra_id:nota.id,insumo_id:l.insumo_id,cantidad_base:l.cantidad_base,costo_unitario:l.costo_unitario,subtotal:l.subtotal})),{transaction});
    for(const l of lineas) await registrarMovimiento({insumo_id:l.insumo_id,tipo_transaccion:'SALIDA_AJUSTE',cantidad:l.cantidad_base,
      operacion_uid:`mov:compra:${nota.id}:insumo:${l.insumo_id}`,usuario_id:actor,referencia_documento:`compra:${nota.id}`,notas:`Compensa compra ${id}: ${motivo}`},{transaction});
    await c.update({estado_registro:'compensada'},{transaction});
    await auditoria('compras_compensaciones',nota.id,actor,null,{compra_origen_id:id,documento,motivo,revision:datos.revision,autorizacion_id:aprobacion.id},'Documento compensatorio de compra completa',transaction);
    return serializar(nota,transaction);
  });
}
