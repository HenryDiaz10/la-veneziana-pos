import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la tabla roles utilizando la conexión compartida.
// Definir el modelo no crea la tabla ni abre una conexión.
export const Rol = sequelize.define(
  'Rol',
  {
    // Identificador entero que MySQL genera automáticamente.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre obligatorio y único, por ejemplo: cajero.
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    // Explicación opcional de la función del rol.
    descripcion: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },

    // Marca los roles reservados del sistema.
    // La regla que impida eliminarlos se implementará después.
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    // Fecha de creación del registro.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de la última modificación del registro.
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en nuestro SQL.
    tableName: 'roles',

    // Sequelize administra las fechas al crear y actualizar registros.
    timestamps: true,

    // Utilizamos los nombres del SQL en lugar de createdAt y updatedAt.
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);