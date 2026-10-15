import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Vincula los productos con sus grupos de modificadores.
export const ProductoModificador = sequelize.define(
  'ProductoModificador',
  {
    // Producto que tendrá disponible el grupo de opciones.
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'productos_venta',
        key: 'id',
      },

      // Si se elimina el producto, se eliminan sus vínculos.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },

    // Grupo de modificadores disponible para el producto.
    grupo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'modificadores_catalogo',
        key: 'id',
      },

      // Si se elimina el grupo, se eliminan sus vínculos.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'producto_modificadores',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);