import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las series y sus próximos números.
// No asigna correlativos ni los incrementa automáticamente.
export const SerieComprobante = sequelize.define(
  'SerieComprobante',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Tipo de documento al que pertenece la serie.
    tipo: {
      type: DataTypes.ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito',
      ),
      allowNull: false,
    },

    // Serie del documento.
    serie: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },

    // Próximo número disponible dentro de la serie.
    siguiente_numero: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '1',
    },

    // Indica si la serie está habilitada.
    activa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'series_comprobantes',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,

    indexes: [
      {
        // Evita repetir la misma serie para el mismo tipo de documento.
        name: 'uq_tipo_serie',
        unique: true,
        fields: ['tipo', 'serie'],
      },
    ],
  },
);