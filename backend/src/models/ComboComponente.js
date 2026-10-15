import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los productos que componen un combo.
// No genera pedidos ni tareas de cocina automáticamente.
export const ComboComponente = sequelize.define(
  'ComboComponente',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Producto principal que representa el combo.
    combo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Producto incluido como componente.
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Variante del componente, cuando corresponde.
    // Su referencia compuesta se creará en la migración.
    variante_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },

    // Número de unidades del componente dentro del combo.
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'combo_componentes',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);