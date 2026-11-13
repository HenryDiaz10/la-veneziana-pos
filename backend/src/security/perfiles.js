// Techo de privilegios para perfiles del sistema. Intersectar con la BD:
// esta política nunca concede un permiso que no esté asignado al rol.
const limites = {
  administrador: ['mesas:gestionar', 'caja:gestionar', 'catalogo:gestionar', 'inventario:gestionar', 'clientes:buscar', 'clientes:gestionar', 'reportes:leer', 'seguridad:gestionar', 'configuracion:gestionar', 'ventas:devolver'],
  mesero: ['pedidos:crear', 'mesas:gestionar', 'clientes:buscar'],
  cajero: ['pedidos:crear', 'ventas:cobrar', 'caja:gestionar', 'clientes:buscar'],
  cocinero: ['kds:operar']
};
export function permisosEfectivos(nombreRol, permisos = []) {
  const limite = Object.hasOwn(limites, nombreRol) ? limites[nombreRol] : null;
  // Los perfiles personalizados conservan sus asignaciones explícitas de BD.
  return permisos.filter(p => !limite || limite.includes(`${p.modulo}:${p.accion}`))
    .map(({ modulo, accion }) => ({ modulo, accion }));
}
