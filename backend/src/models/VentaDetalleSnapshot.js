import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las líneas comerciales conservadas al registrar una venta.
// No calcula importes ni garantiza su inmutabilidad automáticamente.
export const VentaDetalleSnapshot = sequelize.define(
  'VentaDetalleSnapshot',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Venta a la que pertenece la línea.
    venta_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_comprobantes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Línea del pedido que originó este detalle comercial.
    pedido_item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'pedido_items_kds',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Descripción conservada en el momento de la venta.
    descripcion_snapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Cantidad de unidades vendidas.
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Precio unitario aplicado.
    precio_unitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Descuento asignado a esta línea.
    descuento: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: '0.00',
    },

    // Base utilizada para calcular el impuesto de la línea.
    base_imponible: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe del impuesto de la línea.
    impuesto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe total registrado para la línea.
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Copia estructurada de los datos comerciales aplicados.
    snapshot_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'ventas_detalle_snapshot',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,

    indexes: [
      {
        // Evita repetir una línea del pedido dentro de la misma venta.
        name: 'uq_venta_item_snapshot',
        unique: true,
        fields: ['venta_id', 'pedido_item_id'],
      },
    ],
  },
);