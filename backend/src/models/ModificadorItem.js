import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las opciones concretas de cada grupo de modificadores.
export const ModificadorItem = sequelize.define(
  'ModificadorItem',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Grupo al que pertenece la opción.
    grupo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modificadores_catalogo',
        key: 'id',
      },

      // Si se elimina el grupo, se eliminan sus opciones.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },

    // Nombre visible de la opción.
    nombre_modificador: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Importe adicional asociado a la selección.
    precio_adicional: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Identifica una exclusión, por ejemplo: Sin cebolla.
    // La presentación en cocina se implementará después.
    es_exclusion: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'modificadores_items',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);