import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los eventos pendientes de publicación.
// No publica mensajes ni programa reintentos automáticamente.
export const EventoOutbox = sequelize.define(
  'EventoOutbox',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Identificador obligatorio y único del evento.
    event_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Tipo de evento registrado.
    tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    // Nombre de la entidad relacionada.
    entidad: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    // Identificador del registro relacionado.
    entidad_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    // Versión de la entidad asociada al evento.
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Canal o sala a la que se dirigirá el evento.
    sala_destino: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Datos que acompañarán al evento.
    payload_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Número de intentos registrados de publicación.
    intentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Fecha prevista para un próximo intento.
    proximo_intento_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha de publicación registrada, cuando corresponda.
    publicado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del evento.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'eventos_outbox',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,

    indexes: [
      {
        // Facilita localizar eventos pendientes y sus reintentos.
        name: 'idx_outbox_pendientes',
        fields: ['publicado_en', 'proximo_intento_en', 'id'],
      },
    ],
  },
);