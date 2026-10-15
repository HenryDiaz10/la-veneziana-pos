import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los documentos fiscales relacionados con las ventas.
// No genera XML, firma documentos ni realiza envíos automáticamente.
export const ComprobanteFiscal = sequelize.define(
  'ComprobanteFiscal',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Venta relacionada con el documento.
    venta_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_comprobantes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Documento original afectado, cuando corresponde.
    documento_afectado_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'comprobantes_fiscales',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Tipo de documento según el SQL.
    tipo: {
      type: DataTypes.ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito',
      ),
      allowNull: false,
    },

    // Serie asignada al documento.
    serie: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },

    // Número asignado dentro de la serie.
    numero: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    // Estado del procesamiento del documento.
    estado: {
      type: DataTypes.ENUM(
        'pendiente',
        'enviado',
        'aceptado',
        'observado',
        'rechazado',
        'error',
      ),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    // Copia de los datos utilizados para construir el documento.
    snapshot_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Ubicación opcional del XML.
    xml_uri: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },

    // Ubicación opcional de la respuesta recibida.
    respuesta_uri: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },

    // Huella del documento, cuando esté disponible.
    hash_documento: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Identificador obligatorio y único de la operación.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Devolución relacionada, cuando corresponde.
    devolucion_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'ventas_devoluciones',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
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
    tableName: 'comprobantes_fiscales',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,

    indexes: [
      {
        // Evita repetir la numeración para un mismo tipo y serie.
        name: 'uq_documento_tipo_serie_numero',
        unique: true,
        fields: ['tipo', 'serie', 'numero'],
      },
    ],
  },
);