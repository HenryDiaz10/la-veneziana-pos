import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la tabla de auditoría.
// Definir el modelo no registra automáticamente las acciones.
export const AuditLog = sequelize.define(
  'AuditLog',
  {
    // Identificador grande, generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Usuario responsable; puede estar vacío para eventos sin usuario.
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'usuarios',
        key: 'id',
      },

      // Conserva el registro de auditoría si se elimina el usuario.
      onDelete: 'SET NULL',
      onUpdate: 'NO ACTION',
    },

    // Nombre de la entidad o tabla afectada.
    entidad_afectada: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Identificador opcional del registro afectado.
    entidad_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
    },

    // Tipos de eventos definidos en el SQL.
    tipo_evento: {
      type: DataTypes.ENUM(
        'INSERT',
        'UPDATE',
        'DELETE',
        'AUTH',
        'SECURITY_ALERT',
      ),
      allowNull: false,
    },

    // Estado anterior, cuando corresponde.
    datos_anteriores: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    // Estado posterior, cuando corresponde.
    datos_nuevos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    // Explicación opcional del evento.
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Dirección IP de origen; admite IPv4 e IPv6.
    ip_origen: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null,
    },

    // Información opcional del navegador o cliente.
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora en que se creó el registro.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla del SQL.
    tableName: 'audit_logs',

    // Esta tabla registra creación, pero no tiene updated_at.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    // Índice para facilitar consultas por fecha.
    indexes: [
      {
        name: 'idx_audit_fecha',
        fields: ['created_at'],
      },
    ],
  },
);