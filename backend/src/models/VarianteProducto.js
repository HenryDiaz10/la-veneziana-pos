import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las variantes de un producto.
// Cada variante pertenece a un producto de venta.
export const VarianteProducto = sequelize.define(
  'VarianteProducto',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Producto al que pertenece la variante.
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },

      // Si se elimina el producto, se eliminan sus variantes.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },

    // Nombre de la variante: Personal, Mediana, Familiar, etc.
    nombre_variante: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Importe que se añade al precio base del producto.
    precio_adicional: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Costo adicional asociado a esta variante.
    costo_adicional: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'variantes_producto',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,

    // Conserva el índice compuesto añadido en el SQL.
    // Permite referenciar conjuntamente la variante y su producto.
    indexes: [
      {
        name: 'uq_variante_producto',
        unique: true,
        fields: ['id', 'producto_id'],
      },
    ],
  },
);