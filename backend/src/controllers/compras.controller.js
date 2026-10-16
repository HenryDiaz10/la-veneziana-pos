import * as compras from '../services/compras.service.js';
import { consultarInsumosReceta } from '../services/recetas.service.js';
import { ErrorInventario } from '../services/inventario-calculo.js';
import { AutorizacionNoValidaError } from '../services/autorizaciones.service.js';
const entero = v => typeof v==='string'&&/^[1-9]\d{0,9}$/.test(v)&&Number(v)<=2147483647?Number(v):null;
const ERRORES = {
  DATOS_INVALIDOS:[400,'Revisa los campos, fechas, cantidades y costos. Usa punto decimal y los campos permitidos.'],
  DOCUMENTO_DUPLICADO:[409,'Ya existe ese documento para el proveedor, RUC o código de insumo.'],
  OPERACION_EN_CONFLICTO:[409,'Esta operación ya se utilizó con otros datos. Actualiza antes de continuar.'],
  PROVEEDOR_INEXISTENTE:[404,'El proveedor no existe.'],COMPRA_INEXISTENTE:[404,'La compra no existe.'],
  PROVEEDOR_INACTIVO:[409,'El proveedor está inactivo.'],INSUMO_NO_DISPONIBLE:[409,'Uno de los insumos no existe o está inactivo.'],
  PROVEEDOR_CON_DOCUMENTOS:[409,'El RUC no puede cambiar porque el proveedor ya tiene documentos registrados.'],
  COMPRA_SIN_INGRESO:[409,'La compra no tiene todos sus ingresos respaldados en Kardex. Revisa el historial antes de compensar.'],
  UNIDAD_CAMBIADA:[409,'La unidad de un insumo no es compatible.'],CANTIDAD_FUERA_RANGO:[400,'La cantidad o el saldo supera el límite admitido.'],
  COMPRA_INMUTABLE:[409,'La compra ya fue confirmada o compensada. Sus líneas no se pueden editar.'],
  COMPRA_DESACTUALIZADA:[409,'La compra cambió desde que la abriste. Ciérrala y vuelve a abrirla para ver la versión actual.'],
  STOCK_INSUFICIENTE:[409,'No hay disponible suficiente para compensar toda la compra. No se retiró ningún insumo.'],
  SALDOS_INCONSISTENTES:[409,'Los saldos necesitan revisión. No se aplicó la operación.']
};
function consulta(req,permitidos=['pagina','limite','busqueda']) {
  if(Object.keys(req.query).some(k=>!permitidos.includes(k))||Object.values(req.query).some(v=>typeof v!=='string')) throw new ErrorInventario('DATOS_INVALIDOS');
  return {pagina:entero(req.query.pagina??'1'),limite:entero(req.query.limite??'20'),busqueda:req.query.busqueda??'',estado:req.query.estado??'todos'};
}
const manejar=(operacion,status=200)=>async(req,res,next)=>{
  try {res.status(status).json(await operacion(req));}
  catch(e) {
    if(e instanceof AutorizacionNoValidaError) return res.status(403).json({mensaje:'La aprobación administrativa no es válida o venció. Solicita una nueva.'});
    if(e instanceof ErrorInventario&&Object.hasOwn(ERRORES,e.codigo)){const[codigo,mensaje]=ERRORES[e.codigo];return res.status(codigo).json({mensaje});}
    next(e);
  }
};
export const listar = manejar(req=>compras.listarCompras(consulta(req,['pagina','limite','busqueda','estado'])));
export const detalle = manejar(req=>{consulta(req,[]);return compras.consultarCompra(entero(req.params.id));});
export const crear = manejar(req=>compras.guardarCompra(null,req.body,req.auth.usuario.id),201);
export const editar = manejar(req=>compras.guardarCompra(entero(req.params.id),req.body,req.auth.usuario.id));
export const confirmar = manejar(req=>compras.confirmarCompra(entero(req.params.id),req.body,req.auth.usuario.id));
export const compensar = manejar(req=>compras.compensarCompra(entero(req.params.id),req.body,req.auth.usuario.id));
export const proveedores = manejar(req=>compras.listarProveedores(consulta(req)));
export const crearProveedor = manejar(req=>compras.guardarProveedor(null,req.body,req.auth.usuario.id),201);
export const editarProveedor = manejar(req=>compras.guardarProveedor(entero(req.params.id),req.body,req.auth.usuario.id));
export const crearInsumo = manejar(req=>compras.crearInsumoCompra(req.body,req.auth.usuario.id),201);
export const insumos = manejar(async req=>{
  const resultado=await consultarInsumosReceta(consulta(req));
  if(resultado.estado!=='consultado') throw new ErrorInventario('DATOS_INVALIDOS');
  const{estado,...datos}=resultado;void estado;return datos;
});
