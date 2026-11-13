import {solicitarApi} from './api.js'
export async function listarTrabajadores(f,signal){
  const q={pagina:String(f.pagina),limite:'12',busqueda:f.busqueda,estado:f.estado,...(f.rol_id?{rol_id:f.rol_id}:{})}
  const r=await solicitarApi(`/trabajadores?${new URLSearchParams(q)}`,{signal})
  if(!Array.isArray(r?.trabajadores)||!r.paginacion||!r.trabajadores.every(u=>Number.isSafeInteger(u.id)&&typeof u.nombre==='string'&&['activo','suspendido','cesado'].includes(u.estado)&&u.rol&&typeof u.revision==='string'))throw Error('Listado de trabajadores no válido.')
  return r
}
export async function perfilesTrabajadores(_f,signal){const r=await solicitarApi('/roles',{signal});if(!Array.isArray(r.roles))throw Error('Perfiles no disponibles.');return r.roles}
export function guardarTrabajador({accion,registro,datos,clave}){
  const ruta=`/trabajadores${registro?`/${registro.id}`:''}${accion==='password'?'/password':''}`
  return solicitarApi(ruta,{metodo:accion==='eliminar'?'DELETE':accion==='password'||!registro?'POST':'PATCH',datos,claveIdempotencia:clave})
}
