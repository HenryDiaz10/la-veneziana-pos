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

    // Responsable autorizado para abrir futuros turnos de esta terminal.
    cajero_asignado_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    // Revisión de configuración para impedir sobrescrituras concurrentes.
    version_config: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

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
