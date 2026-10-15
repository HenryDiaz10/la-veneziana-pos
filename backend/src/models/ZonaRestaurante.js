import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las áreas del restaurante donde se ubican las mesas.
export const ZonaRestaurante = sequelize.define(
  'ZonaRestaurante',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre visible de la zona.
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Capacidad máxima registrada para la zona.
    aforo_maximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'zonas_restaurante',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);