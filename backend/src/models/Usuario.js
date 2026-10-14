import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe al personal registrado en la tabla usuarios.
// Este modelo no implementa todavía el login ni genera hashes.
export const Usuario = sequelize.define(
  'Usuario',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre obligatorio del empleado.
    nombre_completo: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Documento opcional; no puede repetirse cuando tiene un valor.
    documento_identidad: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },

    // Correo obligatorio y único utilizado para iniciar sesión.
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    // Hash de la contraseña; nunca guardar la contraseña original.
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Hash opcional del PIN para acceso rápido.
    pin_acceso_rapido_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Hash opcional del PIN para autorizar acciones sensibles.
    pin_autorizacion_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Rol asignado al empleado.
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },

      // Impide eliminar un rol que todavía tenga usuarios asignados.
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Dirección opcional de la imagen del empleado.
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha de contratación, sin hora.
    fecha_contratacion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora del último acceso; inicialmente puede estar vacía.
    ultimo_acceso: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Estados definidos en el SQL del proyecto.
    estado: {
      type: DataTypes.ENUM('activo', 'suspendido', 'cesado'),
      allowNull: true,
      defaultValue: 'activo',
    },

    // Fecha de creación del registro.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de la última modificación.
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla del SQL.
    tableName: 'usuarios',

    // Sequelize administra estas fechas al guardar registros.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);