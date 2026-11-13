// Una misma lista gobierna menú, accesos de Inicio y entrada directa por URL.
// El rol limita la sección; el permiso real sigue siendo obligatorio.
const perfilesSistema = ['administrador', 'mesero', 'cajero', 'cocinero']
const secciones = [
  {ruta:'/inicio',texto:'Inicio',icono:'inicio',roles:perfilesSistema},
  {ruta:'/trabajadores',texto:'Mis trabajadores',icono:'clientes',roles:['administrador'],permiso:['seguridad','gestionar'],descripcion:'Administra cuentas y perfiles del equipo.'},
  {ruta:'/reportes',texto:'Reportes gerenciales',icono:'grafico',roles:['administrador'],permiso:['reportes','leer'],descripcion:'Consulta ventas, productos y atención del negocio.'},
  {ruta:'/estado-resultados',texto:'Estado de resultados',icono:'billete',roles:['administrador'],permiso:['reportes','leer'],descripcion:'Revisa ingresos, compras, gastos y resultados.'},
  {ruta:'/cocina',texto:'Cocina y despacho',icono:'recetas',roles:['cocinero'],permiso:['kds','operar'],descripcion:'Consulta las preparaciones y actualiza su avance.'},
  {ruta:'/salon',texto:'Salón y mesas',icono:'mesas',roles:['administrador','mesero'],permiso:['mesas','gestionar'],descripcion:'Revisa las zonas, mesas y atención en salón.'},
  {ruta:'/tomar-pedido',texto:'Tomar pedido',icono:'carrito',roles:['mesero'],permiso:['pedidos','crear'],descripcion:'Selecciona la mesa y envía el pedido del cliente a cocina.'},
  {ruta:'/pos',texto:'Punto de venta',icono:'carrito',roles:['cajero'],permiso:['ventas','cobrar'],descripcion:'Atiende ventas de mostrador desde la caja.'},
  {ruta:'/pagos',texto:'Pagos de pedidos',icono:'billete',roles:['cajero'],permiso:['ventas','cobrar'],descripcion:'Cobra pedidos y entrega sus tickets.'},
  {ruta:'/caja',texto:'Arqueo de caja',icono:'billete',roles:['administrador','cajero'],permiso:['caja','gestionar'],descripcion:'Consulta turnos y cierres de caja según tus permisos.'},
  {ruta:'/catalogo',texto:'Catálogo',icono:'catalogo',roles:['administrador'],permiso:['catalogo','gestionar'],descripcion:'Organiza productos, presentaciones y precios.'},
  {ruta:'/recetas',texto:'Recetas',icono:'recetas',roles:['administrador'],permiso:['catalogo','gestionar'],descripcion:'Define ingredientes, cantidades y rendimiento.'},
  {ruta:'/clientes',texto:'Clientes',icono:'clientes',roles:['administrador','mesero','cajero'],permiso:['clientes','buscar'],descripcion:'Consulta clientes para la atención y sus pedidos.'},
  {ruta:'/inventario',texto:'Inventario',icono:'inventario',roles:['administrador'],permiso:['inventario','gestionar'],descripcion:'Controla existencias y movimientos de almacén.'},
  {ruta:'/compras',texto:'Compras',icono:'compras',roles:['administrador'],permiso:['inventario','gestionar'],descripcion:'Gestiona proveedores y compras de abastecimiento.'}
]
export function obtenerAccesos(usuario) {
  if (!usuario) return []
  const nombre = usuario.rol?.nombre
  return secciones.filter(s =>
    (!perfilesSistema.includes(nombre) || s.roles.includes(nombre)) &&
    (!s.permiso || usuario.permisos?.some(p => p.modulo === s.permiso[0] && p.accion === s.permiso[1])))
}
export function puedeAccederRuta(usuario, ruta) {
  return obtenerAccesos(usuario).some(s => s.ruta === ruta.replace(/\/+$/, ''))
}
