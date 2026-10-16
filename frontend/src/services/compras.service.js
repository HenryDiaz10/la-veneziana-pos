import { solicitarApi } from './api.js'
export function listarCompras({ vista='compras', pagina=1, busqueda='', estado='todos' }, signal) {
  const query=new URLSearchParams({pagina:String(pagina),limite:'20',busqueda,...(vista==='compras'?{estado}:{})})
  return solicitarApi(`/compras${vista==='proveedores'?'/proveedores':''}?${query}`,{signal})
}
export const consultarCompra=({id},signal)=>solicitarApi(`/compras/${id}`,{signal})
export function buscarRecursoCompra({tipo,pagina=1,busqueda=''},signal) {
  return solicitarApi(`/compras/${tipo}?${new URLSearchParams({pagina:String(pagina),limite:'10',busqueda})}`,{signal})
}
export const guardarCompra=(id,datos)=>solicitarApi(`/compras${id?`/${id}`:''}`,{metodo:id?'PUT':'POST',datos})
export const guardarProveedor=(id,datos)=>solicitarApi(`/compras/proveedores${id?`/${id}`:''}`,{metodo:id?'PUT':'POST',datos})
export const crearInsumo=datos=>solicitarApi('/compras/insumos',{metodo:'POST',datos})
export const confirmarCompra=(id,revision)=>solicitarApi(`/compras/${id}/confirmar`,{metodo:'POST',datos:{revision}})
export const autorizarCompensacion=(id,actorId,motivo)=>solicitarApi('/autorizaciones',{metodo:'POST',datos:{actorId,accion:'compras/compensar',entidad:'compras_facturas',entidadId:id,motivo}})
export const compensarCompra=(id,datos)=>solicitarApi(`/compras/${id}/compensar`,{metodo:'POST',datos})
