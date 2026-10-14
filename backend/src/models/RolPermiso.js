import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la tabla que vincula roles y permisos.
// Cada registro representa un permiso asignado a un rol.
export const RolPermiso = sequelize.define(
  'RolPermiso',
  {
    // Identificador del rol que recibe el permiso.
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,

      // Debe corresponder a un rol existente.
      references: {
        model: 'roles',
        key: 'id',
      },

      // Si se elimina el rol, se eliminan sus asignaciones.
      onDelete: 'CASCADE',

      // El SQL no declara propagación al actualizar el identificador.
      onUpdate: 'NO ACTION',
    },

    // Identificador del permiso asignado.
    permiso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,

      // Debe corresponder a un permiso existente.
      references: {
        model: 'permisos',
        key: 'id',
      },

      // Si se elimina el permiso, se eliminan sus asignaciones.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'rol_permisos',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);