import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe aprobaciones para operaciones sensibles.
// No verifica credenciales ni concede permisos automáticamente.
export const AutorizacionSensible = sequelize.define(
  'AutorizacionSensible',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Usuario que realizará la acción autorizada.
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario que aprueba la acción.
    aprobador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Acción concreta que se autoriza.
    accion: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    // Nombre de la entidad sobre la que se actuará.
    entidad: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    // Identificador del registro autorizado.
    entidad_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    // Justificación obligatoria de la aprobación.
    motivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    // Límite de tiempo para utilizar la autorización.
    expira_en: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Fecha de utilización; inicialmente permanece vacía.
    consumida_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del registro.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'autorizaciones_sensibles',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,
  },
);