import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las líneas de una compra a proveedores.
// Cada registro corresponde a un insumo de la compra.
export const CompraDetalle = sequelize.define(
  'CompraDetalle',
  {
    // Identificador grande, generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Cabecera de compra a la que pertenece la línea.
    compra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'compras_facturas',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Insumo adquirido.
    insumo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Cantidad expresada en la unidad base del insumo.
    cantidad_base: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Costo por unidad base, con cuatro posiciones decimales.
    costo_unitario: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Importe de esta línea, con dos posiciones decimales.
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'compras_detalle',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);