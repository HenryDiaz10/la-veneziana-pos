import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los parámetros configurables del sistema.
// No carga ni aplica esos parámetros automáticamente.
export const ConfiguracionGlobal = sequelize.define(
  'ConfiguracionGlobal',
  {
    // Clave que identifica el parámetro; no utiliza un id numérico.
    parametro_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true,
    },

    // Contenido estructurado del parámetro.
    valor_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Explicación opcional del parámetro.
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de la última modificación.
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'configuracion_global',

    // Esta tabla solo tiene fecha de modificación.
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
  },
);