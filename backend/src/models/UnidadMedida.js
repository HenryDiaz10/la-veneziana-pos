import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las unidades utilizadas para medir los insumos.
export const UnidadMedida = sequelize.define(
  'UnidadMedida',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre completo: Kilogramo, Litro, Unidad, etc.
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Representación corta: kg, L, un, etc.
    abreviatura: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'unidades_medida',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);