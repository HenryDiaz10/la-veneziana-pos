import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las sesiones de autenticación.
// No inicia sesiones, firma tokens ni verifica acceso automáticamente.
export const AuthSesion = sequelize.define(
  'AuthSesion',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Usuario al que pertenece la sesión.
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

    // Identificador obligatorio y único de la sesión.
    session_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Hash opcional del token de renovación, si se utiliza.
    // No almacena el token original.
    refresh_hash: {
      type: DataTypes.CHAR(64),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de vencimiento de la sesión.
    expira_en: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Fecha de revocación; inicialmente permanece vacía.
    revocada_en: {
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
    tableName: 'auth_sesiones',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,
  },
);