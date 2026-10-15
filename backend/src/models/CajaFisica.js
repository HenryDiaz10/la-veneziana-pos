import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las terminales físicas de caja del restaurante.
// Los turnos y sus importes se guardarán en SesionCajaZ.
export const CajaFisica = sequelize.define(
  'CajaFisica',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre visible de la terminal.
    nombre_terminal: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Dirección IP opcional del equipo.
    ip_maquina: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null,
    },

    // Estado de la terminal según el SQL.
    estado: {
      type: DataTypes.ENUM('activa', 'mantenimiento'),
      allowNull: true,
      defaultValue: 'activa',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'cajas_fisicas',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);