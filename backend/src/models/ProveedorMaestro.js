import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe el catálogo de proveedores del restaurante.
export const ProveedorMaestro = sequelize.define(
  'ProveedorMaestro',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre legal o razón social del proveedor.
    razon_social: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    // Identificador tributario obligatorio y único.
    ruc: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    // Nombre opcional del representante legal.
    representante_legal: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },

    // Teléfono de contacto, almacenado como texto.
    telefono_contacto: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },

    // Correo de contacto opcional.
    correo_contacto: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Plazo de crédito expresado en días.
    dias_credito: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Datos opcionales de la cuenta bancaria.
    cuenta_bancaria: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Estado del proveedor según el SQL.
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: true,
      defaultValue: 'activo',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'proveedores_maestro',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);