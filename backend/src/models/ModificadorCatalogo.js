import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los grupos de modificadores.
// Las opciones concretas se definirán en ModificadorItem.
export const ModificadorCatalogo = sequelize.define(
  'ModificadorCatalogo',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre visible del grupo: Bordes de pizza, Extras, etc.
    nombre_grupo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Indica si se permite seleccionar varias opciones del grupo.
    es_multiple: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    // Indica si se exige seleccionar una opción del grupo.
    es_obligatorio: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'modificadores_catalogo',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);