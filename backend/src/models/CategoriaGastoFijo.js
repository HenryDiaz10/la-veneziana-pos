import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las categorías utilizadas para clasificar gastos.
export const CategoriaGastoFijo = sequelize.define(
  'CategoriaGastoFijo',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre de la categoría: Luz, Agua, Alquiler, etc.
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Indicador almacenado según la definición del SQL.
    es_deducible_impuestos: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'categorias_gastos_fijos',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);