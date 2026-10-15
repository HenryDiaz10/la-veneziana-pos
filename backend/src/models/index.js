// Punto central para cargar modelos y definir sus asociaciones.
import { Rol } from './Rol.js';
import { Permiso } from './Permiso.js';
import { RolPermiso } from './RolPermiso.js';
import { Usuario } from './Usuario.js';
import { AuditLog } from './AuditLog.js';
import { CategoriaVenta } from './CategoriaVenta.js';
import { ProductoVenta } from './ProductoVenta.js';
import { VarianteProducto } from './VarianteProducto.js';
import { ModificadorCatalogo } from './ModificadorCatalogo.js';
import { ModificadorItem } from './ModificadorItem.js';
import { ProductoModificador } from './ProductoModificador.js';
import { UnidadMedida } from './UnidadMedida.js';
import { InsumoAlmacen } from './InsumoAlmacen.js';
import { RecetaBom } from './RecetaBom.js';
import { Cliente } from './Cliente.js';
import { DireccionCliente } from './DireccionCliente.js';
import { CrmMovimientoPuntos } from './CrmMovimientoPuntos.js';
import { ProveedorMaestro } from './ProveedorMaestro.js';
import { CompraFactura } from './CompraFactura.js';
import { CompraDetalle } from './CompraDetalle.js';
import { InventarioKardex } from './InventarioKardex.js';
import { ZonaRestaurante } from './ZonaRestaurante.js';
import { MesaSalon } from './MesaSalon.js';
import { PedidoMaster } from './PedidoMaster.js';
import { PedidoItemKds } from './PedidoItemKds.js';
import { PedidoItemModificador } from './PedidoItemModificador.js';
import { CajaFisica } from './CajaFisica.js';
import { SesionCajaZ } from './SesionCajaZ.js';
import { MovimientoCajaChica } from './MovimientoCajaChica.js';
import { VentaComprobante } from './VentaComprobante.js';
import { VentaPagoSplit } from './VentaPagoSplit.js';
import { CategoriaGastoFijo } from './CategoriaGastoFijo.js';
import { GastoFinancieroOperativo } from './GastoFinancieroOperativo.js';
import { ConfiguracionGlobal } from './ConfiguracionGlobal.js';
import { ModificadorBom } from './ModificadorBom.js';
import { ComboComponente } from './ComboComponente.js';
import { KdsTarea } from './KdsTarea.js';
import { ReservaInsumo } from './ReservaInsumo.js';
import { KdsHistorial } from './KdsHistorial.js';
import { IdempotenciaOperacion } from './IdempotenciaOperacion.js';
import { EventoOutbox } from './EventoOutbox.js';
import { TrabajoImpresion } from './TrabajoImpresion.js';
import { VentaDetalleSnapshot } from './VentaDetalleSnapshot.js';
import { SerieComprobante } from './SerieComprobante.js';
import { ComprobanteFiscal } from './ComprobanteFiscal.js';
import { VentaDevolucion } from './VentaDevolucion.js';
import { DevolucionDetalle } from './DevolucionDetalle.js';
import { DevolucionPago } from './DevolucionPago.js';
import { AutorizacionSensible } from './AutorizacionSensible.js';
import { AuthSesion } from './AuthSesion.js';
import { IncidenciaOperativa } from './IncidenciaOperativa.js';

// Un rol puede estar asignado a varios usuarios.
Rol.hasMany(Usuario, {
  as: 'usuarios',
  foreignKey: 'rol_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada usuario tiene un rol.
Usuario.belongsTo(Rol, {
  as: 'rol',
  foreignKey: 'rol_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un rol puede tener varios permisos.
Rol.belongsToMany(Permiso, {
  as: 'permisos',

  through: {
    model: RolPermiso,
    unique: false
  },

  foreignKey: 'rol_id',
  otherKey: 'permiso_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un permiso puede estar asignado a varios roles.
Permiso.belongsToMany(Rol, {
  as: 'roles',

  through: {
    model: RolPermiso,
    unique: false
  },

  foreignKey: 'permiso_id',
  otherKey: 'rol_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un usuario puede tener múltiples eventos de auditoría.
Usuario.hasMany(AuditLog, {
  as: 'eventosAuditoria',
  foreignKey: 'usuario_id',
  onDelete: 'SET NULL',
  onUpdate: 'NO ACTION'
});

// Un evento puede conservarse aunque su usuario sea eliminado.
AuditLog.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'SET NULL',
  onUpdate: 'NO ACTION'
});

// Una categoría puede contener varios productos.
CategoriaVenta.hasMany(ProductoVenta, {
  as: 'productos',
  foreignKey: 'categoria_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada producto pertenece a una categoría.
ProductoVenta.belongsTo(CategoriaVenta, {
  as: 'categoria',
  foreignKey: 'categoria_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un producto puede tener varias variantes.
ProductoVenta.hasMany(VarianteProducto, {
  as: 'variantes',
  foreignKey: 'producto_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Cada variante pertenece a un producto.
VarianteProducto.belongsTo(ProductoVenta, {
  as: 'producto',
  foreignKey: 'producto_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un grupo contiene varias opciones.
ModificadorCatalogo.hasMany(ModificadorItem, {
  as: 'items',
  foreignKey: 'grupo_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Cada opción pertenece a un grupo.
ModificadorItem.belongsTo(ModificadorCatalogo, {
  as: 'grupo',
  foreignKey: 'grupo_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un producto puede ofrecer varios grupos de modificadores.
ProductoVenta.belongsToMany(ModificadorCatalogo, {
  as: 'gruposModificadores',

  through: {
    model: ProductoModificador,
    unique: false
  },

  foreignKey: 'producto_id',
  otherKey: 'grupo_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un mismo grupo puede utilizarse en varios productos.
ModificadorCatalogo.belongsToMany(ProductoVenta, {
  as: 'productos',

  through: {
    model: ProductoModificador,
    unique: false
  },

  foreignKey: 'grupo_id',
  otherKey: 'producto_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Una unidad de medida puede utilizarse en varios insumos.
UnidadMedida.hasMany(InsumoAlmacen, {
  as: 'insumos',
  foreignKey: 'unidad_medida_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada insumo utiliza una unidad de medida.
InsumoAlmacen.belongsTo(UnidadMedida, {
  as: 'unidadMedida',
  foreignKey: 'unidad_medida_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede estar vinculado a varios productos directos.
InsumoAlmacen.hasMany(ProductoVenta, {
  as: 'productosDirectos',
  foreignKey: 'insumo_directo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un producto puede tener un insumo directo asociado.
// La columna admite NULL, por ejemplo para platos con receta.
ProductoVenta.belongsTo(InsumoAlmacen, {
  as: 'insumoDirecto',
  foreignKey: 'insumo_directo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un producto puede tener varias líneas de receta.
ProductoVenta.hasMany(RecetaBom, {
  as: 'recetas',
  foreignKey: 'producto_venta_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada línea de receta pertenece a un producto.
RecetaBom.belongsTo(ProductoVenta, {
  as: 'producto',
  foreignKey: 'producto_venta_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Una variante puede tener sus propias líneas de receta.
VarianteProducto.hasMany(RecetaBom, {
  as: 'recetas',
  foreignKey: 'variante_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// La variante es opcional: una receta base puede tener NULL.
RecetaBom.belongsTo(VarianteProducto, {
  as: 'variante',
  foreignKey: 'variante_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un insumo puede utilizarse en distintas recetas.
InsumoAlmacen.hasMany(RecetaBom, {
  as: 'recetas',
  foreignKey: 'insumo_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada línea de receta indica un insumo.
RecetaBom.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un cliente puede tener varias direcciones.
Cliente.hasMany(DireccionCliente, {
  as: 'direcciones',
  foreignKey: 'cliente_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Cada dirección pertenece a un cliente.
DireccionCliente.belongsTo(Cliente, {
  as: 'cliente',
  foreignKey: 'cliente_id',
  onDelete: 'CASCADE',
  onUpdate: 'NO ACTION'
});

// Un cliente puede tener varios movimientos de puntos.
Cliente.hasMany(CrmMovimientoPuntos, {
  as: 'movimientosPuntos',
  foreignKey: 'cliente_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada movimiento de puntos pertenece a un cliente.
CrmMovimientoPuntos.belongsTo(Cliente, {
  as: 'cliente',
  foreignKey: 'cliente_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un proveedor puede tener varias compras registradas.
ProveedorMaestro.hasMany(CompraFactura, {
  as: 'compras',
  foreignKey: 'proveedor_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada compra corresponde a un proveedor.
CompraFactura.belongsTo(ProveedorMaestro, {
  as: 'proveedor',
  foreignKey: 'proveedor_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un usuario puede registrar varias compras.
Usuario.hasMany(CompraFactura, {
  as: 'comprasRegistradas',
  foreignKey: 'usuario_registro_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar quién registró la compra.
CompraFactura.belongsTo(Usuario, {
  as: 'usuarioRegistro',
  foreignKey: 'usuario_registro_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una compra contiene varias líneas de detalle.
CompraFactura.hasMany(CompraDetalle, {
  as: 'detalles',
  foreignKey: 'compra_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada detalle pertenece a una compra.
CompraDetalle.belongsTo(CompraFactura, {
  as: 'compra',
  foreignKey: 'compra_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede aparecer en distintas compras.
InsumoAlmacen.hasMany(CompraDetalle, {
  as: 'detallesCompra',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada detalle identifica el insumo comprado.
CompraDetalle.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede tener múltiples movimientos de inventario.
InsumoAlmacen.hasMany(InventarioKardex, {
  as: 'movimientosKardex',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada movimiento corresponde a un insumo.
InventarioKardex.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un usuario puede registrar múltiples movimientos.
Usuario.hasMany(InventarioKardex, {
  as: 'movimientosKardex',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario responsable del movimiento.
InventarioKardex.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una zona puede contener varias mesas.
ZonaRestaurante.hasMany(MesaSalon, {
  as: 'mesas',
  foreignKey: 'zona_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Cada mesa pertenece a una zona.
MesaSalon.belongsTo(ZonaRestaurante, {
  as: 'zona',
  foreignKey: 'zona_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un usuario puede tener varias mesas asignadas.
Usuario.hasMany(MesaSalon, {
  as: 'mesasAsignadas',
  foreignKey: 'mesero_asignado_id',
  onDelete: 'SET NULL',
  onUpdate: 'NO ACTION'
});

// La mesa puede tener un mesero asignado.
MesaSalon.belongsTo(Usuario, {
  as: 'meseroAsignado',
  foreignKey: 'mesero_asignado_id',
  onDelete: 'SET NULL',
  onUpdate: 'NO ACTION'
});

// Una mesa puede tener varios pedidos a lo largo del tiempo.
MesaSalon.hasMany(PedidoMaster, {
  as: 'pedidos',
  foreignKey: 'mesa_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoMaster.belongsTo(MesaSalon, {
  as: 'mesa',
  foreignKey: 'mesa_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un cliente puede realizar varios pedidos.
Cliente.hasMany(PedidoMaster, {
  as: 'pedidos',
  foreignKey: 'cliente_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoMaster.belongsTo(Cliente, {
  as: 'cliente',
  foreignKey: 'cliente_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una dirección puede utilizarse en varios pedidos.
DireccionCliente.hasMany(PedidoMaster, {
  as: 'pedidos',
  foreignKey: 'direccion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoMaster.belongsTo(DireccionCliente, {
  as: 'direccion',
  foreignKey: 'direccion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que creó el pedido.
Usuario.hasMany(PedidoMaster, {
  as: 'pedidosCreados',
  foreignKey: 'usuario_creador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoMaster.belongsTo(Usuario, {
  as: 'usuarioCreador',
  foreignKey: 'usuario_creador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario asociado al bloqueo temporal.
Usuario.hasMany(PedidoMaster, {
  as: 'pedidosBloqueados',
  foreignKey: 'bloqueo_usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoMaster.belongsTo(Usuario, {
  as: 'usuarioBloqueo',
  foreignKey: 'bloqueo_usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un pedido contiene varias líneas.
PedidoMaster.hasMany(PedidoItemKds, {
  as: 'items',
  foreignKey: 'pedido_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

PedidoItemKds.belongsTo(PedidoMaster, {
  as: 'pedido',
  foreignKey: 'pedido_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Un producto puede aparecer en muchas líneas de pedido.
ProductoVenta.hasMany(PedidoItemKds, {
  as: 'itemsPedido',
  foreignKey: 'producto_venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoItemKds.belongsTo(ProductoVenta, {
  as: 'producto',
  foreignKey: 'producto_venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Navegar hacia la variante sin declarar una FK simple adicional.
// MySQL ya protege la pareja variante/producto mediante su FK compuesta.
VarianteProducto.hasMany(PedidoItemKds, {
  as: 'itemsPedido',
  foreignKey: 'variante_id',
  constraints: false
});

PedidoItemKds.belongsTo(VarianteProducto, {
  as: 'variante',
  foreignKey: 'variante_id',
  constraints: false
});

// Una línea puede tener varios modificadores seleccionados.
PedidoItemKds.hasMany(PedidoItemModificador, {
  as: 'modificadores',
  foreignKey: 'pedido_item_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

PedidoItemModificador.belongsTo(PedidoItemKds, {
  as: 'itemPedido',
  foreignKey: 'pedido_item_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Cada selección apunta a una opción del catálogo.
ModificadorItem.hasMany(PedidoItemModificador, {
  as: 'seleccionesPedido',
  foreignKey: 'modificador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

PedidoItemModificador.belongsTo(ModificadorItem, {
  as: 'modificador',
  foreignKey: 'modificador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una caja física puede tener varias sesiones históricas.
CajaFisica.hasMany(SesionCajaZ, {
  as: 'sesiones',
  foreignKey: 'caja_fisica_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

SesionCajaZ.belongsTo(CajaFisica, {
  as: 'cajaFisica',
  foreignKey: 'caja_fisica_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un cajero puede tener varias sesiones históricas.
Usuario.hasMany(SesionCajaZ, {
  as: 'sesionesCaja',
  foreignKey: 'cajero_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

SesionCajaZ.belongsTo(Usuario, {
  as: 'cajero',
  foreignKey: 'cajero_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una sesión puede contener varios movimientos de caja chica.
SesionCajaZ.hasMany(MovimientoCajaChica, {
  as: 'movimientos',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

MovimientoCajaChica.belongsTo(SesionCajaZ, {
  as: 'sesion',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que autorizó el movimiento.
Usuario.hasMany(MovimientoCajaChica, {
  as: 'movimientosCajaAutorizados',
  foreignKey: 'autorizado_por',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

MovimientoCajaChica.belongsTo(Usuario, {
  as: 'autorizador',
  foreignKey: 'autorizado_por',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un pedido puede tener una venta.
// MySQL garantiza la relación mediante pedido_id UNIQUE.
PedidoMaster.hasOne(VentaComprobante, {
  as: 'venta',
  foreignKey: 'pedido_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaComprobante.belongsTo(PedidoMaster, {
  as: 'pedido',
  foreignKey: 'pedido_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una sesión de caja puede registrar varias ventas.
SesionCajaZ.hasMany(VentaComprobante, {
  as: 'ventas',
  foreignKey: 'sesion_caja_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaComprobante.belongsTo(SesionCajaZ, {
  as: 'sesionCaja',
  foreignKey: 'sesion_caja_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al cajero que registró la venta.
Usuario.hasMany(VentaComprobante, {
  as: 'ventasCobradas',
  foreignKey: 'cajero_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaComprobante.belongsTo(Usuario, {
  as: 'cajero',
  foreignKey: 'cajero_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una venta puede pagarse mediante varios métodos.
VentaComprobante.hasMany(VentaPagoSplit, {
  as: 'pagos',
  foreignKey: 'venta_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

VentaPagoSplit.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'RESTRICT',
  onUpdate: 'NO ACTION'
});

// Vincular los movimientos de puntos con su venta de origen.
VentaComprobante.hasMany(CrmMovimientoPuntos, {
  as: 'movimientosPuntos',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

CrmMovimientoPuntos.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una categoría puede agrupar varios gastos.
CategoriaGastoFijo.hasMany(GastoFinancieroOperativo, {
  as: 'gastos',
  foreignKey: 'categoria_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

GastoFinancieroOperativo.belongsTo(CategoriaGastoFijo, {
  as: 'categoria',
  foreignKey: 'categoria_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que registró el gasto.
Usuario.hasMany(GastoFinancieroOperativo, {
  as: 'gastosRegistrados',
  foreignKey: 'usuario_registro_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

GastoFinancieroOperativo.belongsTo(Usuario, {
  as: 'usuarioRegistro',
  foreignKey: 'usuario_registro_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un movimiento puede estar asociado como máximo a un gasto.
// MySQL lo garantiza mediante uq_gasto_movimiento.
MovimientoCajaChica.hasOne(GastoFinancieroOperativo, {
  as: 'gastoAsociado',
  foreignKey: 'movimiento_caja_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

GastoFinancieroOperativo.belongsTo(MovimientoCajaChica, {
  as: 'movimientoCaja',
  foreignKey: 'movimiento_caja_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un modificador puede ajustar varios insumos.
ModificadorItem.hasMany(ModificadorBom, {
  as: 'componentesReceta',
  foreignKey: 'modificador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ModificadorBom.belongsTo(ModificadorItem, {
  as: 'modificador',
  foreignKey: 'modificador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede intervenir en diferentes modificadores.
InsumoAlmacen.hasMany(ModificadorBom, {
  as: 'ajustesModificadores',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ModificadorBom.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});
// Un producto de tipo combo puede tener varios componentes.
ProductoVenta.hasMany(ComboComponente, {
  as: 'componentesCombo',
  foreignKey: 'combo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Producto que representa al combo.
ComboComponente.belongsTo(ProductoVenta, {
  as: 'combo',
  foreignKey: 'combo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un producto puede formar parte de diferentes combos.
ProductoVenta.hasMany(ComboComponente, {
  as: 'participacionesEnCombos',
  foreignKey: 'producto_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Producto incluido como componente.
ComboComponente.belongsTo(ProductoVenta, {
  as: 'producto',
  foreignKey: 'producto_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Variante opcional del producto incluido.
// La FK compuesta de MySQL valida la pareja variante/producto.
VarianteProducto.hasMany(ComboComponente, {
  as: 'participacionesEnCombos',
  foreignKey: 'variante_id',
  constraints: false
});

ComboComponente.belongsTo(VarianteProducto, {
  as: 'variante',
  foreignKey: 'variante_id',
  constraints: false
});

// Un ítem puede generar varias tareas, por ejemplo al descomponer un combo.
PedidoItemKds.hasMany(KdsTarea, {
  as: 'tareas',
  foreignKey: 'pedido_item_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

KdsTarea.belongsTo(PedidoItemKds, {
  as: 'itemPedido',
  foreignKey: 'pedido_item_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Producto que cocina debe preparar.
ProductoVenta.hasMany(KdsTarea, {
  as: 'tareasCocina',
  foreignKey: 'producto_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

KdsTarea.belongsTo(ProductoVenta, {
  as: 'producto',
  foreignKey: 'producto_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Navegar hacia la variante opcional.
// MySQL valida la pareja variante/producto mediante su FK compuesta.
VarianteProducto.hasMany(KdsTarea, {
  as: 'tareasCocina',
  foreignKey: 'variante_id',
  constraints: false
});

KdsTarea.belongsTo(VarianteProducto, {
  as: 'variante',
  foreignKey: 'variante_id',
  constraints: false
});

// Una tarea puede reservar varios insumos.
KdsTarea.hasMany(ReservaInsumo, {
  as: 'reservasInsumos',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ReservaInsumo.belongsTo(KdsTarea, {
  as: 'tarea',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede estar reservado para distintas tareas.
InsumoAlmacen.hasMany(ReservaInsumo, {
  as: 'reservas',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ReservaInsumo.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un movimiento de Kardex puede vincularse como máximo a una reserva.
// MySQL lo garantiza mediante uq_reserva_kardex.
InventarioKardex.hasOne(ReservaInsumo, {
  as: 'reservaInsumo',
  foreignKey: 'kardex_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ReservaInsumo.belongsTo(InventarioKardex, {
  as: 'movimientoKardex',
  foreignKey: 'kardex_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una tarea puede tener varios cambios de estado registrados.
KdsTarea.hasMany(KdsHistorial, {
  as: 'historial',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

KdsHistorial.belongsTo(KdsTarea, {
  as: 'tarea',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que realizó cada cambio.
Usuario.hasMany(KdsHistorial, {
  as: 'cambiosEstadoKds',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

KdsHistorial.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un usuario puede tener múltiples operaciones idempotentes.
Usuario.hasMany(IdempotenciaOperacion, {
  as: 'operacionesIdempotentes',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que solicitó la operación.
IdempotenciaOperacion.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una venta puede generar varios trabajos de impresión.
VentaComprobante.hasMany(TrabajoImpresion, {
  as: 'trabajosImpresion',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

TrabajoImpresion.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un pedido puede generar comandas u otros trabajos.
PedidoMaster.hasMany(TrabajoImpresion, {
  as: 'trabajosImpresion',
  foreignKey: 'pedido_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

TrabajoImpresion.belongsTo(PedidoMaster, {
  as: 'pedido',
  foreignKey: 'pedido_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una sesión puede tener trabajos, como la impresión de cierre.
SesionCajaZ.hasMany(TrabajoImpresion, {
  as: 'trabajosImpresion',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

TrabajoImpresion.belongsTo(SesionCajaZ, {
  as: 'sesionCaja',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que solicitó la impresión.
Usuario.hasMany(TrabajoImpresion, {
  as: 'impresionesSolicitadas',
  foreignKey: 'solicitado_por',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

TrabajoImpresion.belongsTo(Usuario, {
  as: 'solicitante',
  foreignKey: 'solicitado_por',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una venta contiene varias líneas comerciales conservadas.
VentaComprobante.hasMany(VentaDetalleSnapshot, {
  as: 'detallesSnapshot',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaDetalleSnapshot.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Relacionar cada línea comercial con el ítem de pedido de origen.
PedidoItemKds.hasMany(VentaDetalleSnapshot, {
  as: 'detallesVenta',
  foreignKey: 'pedido_item_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaDetalleSnapshot.belongsTo(PedidoItemKds, {
  as: 'itemPedido',
  foreignKey: 'pedido_item_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una venta puede tener varios documentos fiscales.
VentaComprobante.hasMany(ComprobanteFiscal, {
  as: 'comprobantesFiscales',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ComprobanteFiscal.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un documento puede ser referenciado por otros documentos.
// Por ejemplo, una nota de crédito referencia al documento afectado.
ComprobanteFiscal.hasMany(ComprobanteFiscal, {
  as: 'documentosRelacionados',
  foreignKey: 'documento_afectado_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ComprobanteFiscal.belongsTo(ComprobanteFiscal, {
  as: 'documentoAfectado',
  foreignKey: 'documento_afectado_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una venta puede tener varias devoluciones.
VentaComprobante.hasMany(VentaDevolucion, {
  as: 'devoluciones',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaDevolucion.belongsTo(VentaComprobante, {
  as: 'venta',
  foreignKey: 'venta_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que registró la devolución.
Usuario.hasMany(VentaDevolucion, {
  as: 'devolucionesRegistradas',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaDevolucion.belongsTo(Usuario, {
  as: 'usuarioRegistro',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que autorizó la devolución.
Usuario.hasMany(VentaDevolucion, {
  as: 'devolucionesAutorizadas',
  foreignKey: 'autorizador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

VentaDevolucion.belongsTo(Usuario, {
  as: 'autorizador',
  foreignKey: 'autorizador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Vincular los documentos fiscales emitidos por la devolución.
VentaDevolucion.hasMany(ComprobanteFiscal, {
  as: 'comprobantesFiscales',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

ComprobanteFiscal.belongsTo(VentaDevolucion, {
  as: 'devolucion',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una devolución contiene varias líneas.
VentaDevolucion.hasMany(DevolucionDetalle, {
  as: 'detalles',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

DevolucionDetalle.belongsTo(VentaDevolucion, {
  as: 'devolucion',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una línea vendida puede tener varias devoluciones parciales.
VentaDetalleSnapshot.hasMany(DevolucionDetalle, {
  as: 'detallesDevolucion',
  foreignKey: 'venta_detalle_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

DevolucionDetalle.belongsTo(VentaDetalleSnapshot, {
  as: 'detalleVenta',
  foreignKey: 'venta_detalle_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una devolución puede desembolsarse mediante varios pagos.
VentaDevolucion.hasMany(DevolucionPago, {
  as: 'pagos',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

DevolucionPago.belongsTo(VentaDevolucion, {
  as: 'devolucion',
  foreignKey: 'devolucion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar la sesión donde se registró el desembolso.
SesionCajaZ.hasMany(DevolucionPago, {
  as: 'pagosDevoluciones',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

DevolucionPago.belongsTo(SesionCajaZ, {
  as: 'sesionCaja',
  foreignKey: 'sesion_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Usuario que solicita realizar una acción sensible.
Usuario.hasMany(AutorizacionSensible, {
  as: 'autorizacionesSolicitadas',
  foreignKey: 'actor_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

AutorizacionSensible.belongsTo(Usuario, {
  as: 'actor',
  foreignKey: 'actor_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Usuario que aprueba la acción.
Usuario.hasMany(AutorizacionSensible, {
  as: 'autorizacionesAprobadas',
  foreignKey: 'aprobador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

AutorizacionSensible.belongsTo(Usuario, {
  as: 'aprobador',
  foreignKey: 'aprobador_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un usuario puede tener varias sesiones de autenticación.
Usuario.hasMany(AuthSesion, {
  as: 'sesionesAuth',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

AuthSesion.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Un insumo puede tener varias incidencias registradas.
InsumoAlmacen.hasMany(IncidenciaOperativa, {
  as: 'incidencias',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

IncidenciaOperativa.belongsTo(InsumoAlmacen, {
  as: 'insumo',
  foreignKey: 'insumo_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Una tarea puede tener varias incidencias.
KdsTarea.hasMany(IncidenciaOperativa, {
  as: 'incidencias',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

IncidenciaOperativa.belongsTo(KdsTarea, {
  as: 'tarea',
  foreignKey: 'tarea_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Identificar al usuario que registró la incidencia.
Usuario.hasMany(IncidenciaOperativa, {
  as: 'incidenciasRegistradas',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

IncidenciaOperativa.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuario_id',
  onDelete: 'NO ACTION',
  onUpdate: 'NO ACTION'
});

// Exportar los modelos desde este punto central.
export {
  Rol,
  Permiso,
  RolPermiso,
  Usuario,
  AuditLog,
  CategoriaVenta,
  ProductoVenta,
  VarianteProducto
};

export {
  ModificadorCatalogo,
  ModificadorItem,
  ProductoModificador
};

export {
  UnidadMedida,
  InsumoAlmacen
};

export { RecetaBom };

export {
  Cliente,
  DireccionCliente,
  CrmMovimientoPuntos
};

export {
  ProveedorMaestro,
  CompraFactura,
  CompraDetalle
};

export { InventarioKardex };

export {
  ZonaRestaurante,
  MesaSalon
};

export { PedidoMaster };

export {
  PedidoItemKds,
  PedidoItemModificador
};

export {
  CajaFisica,
  SesionCajaZ,
  MovimientoCajaChica
};

export {
  VentaComprobante,
  VentaPagoSplit
};

export {
  CategoriaGastoFijo,
  GastoFinancieroOperativo,
  ConfiguracionGlobal
};

export { ModificadorBom };

export { ComboComponente };

export { KdsTarea };

export { ReservaInsumo };

export { KdsHistorial };

export {
  IdempotenciaOperacion,
  EventoOutbox
};

export { TrabajoImpresion };

export { VentaDetalleSnapshot };

export {
  SerieComprobante,
  ComprobanteFiscal
};

export { VentaDevolucion };

export {
  DevolucionDetalle,
  DevolucionPago
};

export {
  AutorizacionSensible,
  AuthSesion
};

export { IncidenciaOperativa };