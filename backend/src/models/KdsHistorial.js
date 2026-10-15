import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las transiciones registradas de las tareas de cocina.
// No cambia el estado de la tarea ni valida permisos automáticamente.
export const KdsHistorial = sequelize.define(
  'KdsHistorial',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Tarea cuyo cambio se registra.
    tarea_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'kds_tareas',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario que realizó la transición.
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Estado previo, almacenado como texto según el SQL.
    estado_anterior: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    // Estado resultante de la transición.
    estado_nuevo: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    // Versión de la tarea asociada al cambio.
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Identificador obligatorio y único de la operación.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Explicación opcional del cambio.
    motivo: {
      type: DataTypes.STRING(500),
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
    tableName: 'kds_historial',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,

    indexes: [
      {
        // Evita registrar dos transiciones para la misma versión de tarea.
        name: 'uq_historial_tarea_version',
        unique: true,
        fields: ['tarea_id', 'version'],
      },
    ],
  },
);