import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe el catálogo de permisos.
// Definir este modelo no crea la tabla en MySQL.
export const Permiso = sequelize.define(
  'Permiso',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Área del sistema a la que pertenece el permiso.
    // Ejemplos: ventas, inventario o configuracion.
    modulo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Operación que permite realizar.
    // Ejemplos: crear, leer, actualizar o anular.
    accion: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Explicación opcional del permiso.
    descripcion: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en nuestro SQL.
    tableName: 'permisos',

    // Esta tabla no tiene created_at ni updated_at.
    timestamps: false,

    // La combinación de módulo y acción debe ser única.
    indexes: [
      {
        name: 'idx_modulo_accion',
        unique: true,
        fields: ['modulo', 'accion'],
      },
    ],
  },
);