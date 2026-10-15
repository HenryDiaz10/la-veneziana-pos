import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la cabecera de una devolución.
// No desembolsa dinero, modifica stock ni anula ventas automáticamente.
export const VentaDevolucion = sequelize.define(
  'VentaDevolucion',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Venta original a la que corresponde la devolución.
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

    // Usuario que registra la devolución.
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario que autoriza la operación.
    autorizador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Explicación obligatoria de la devolución.
    motivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    // Importe total de la devolución.
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Identificador obligatorio y único de la operación.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
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
    tableName: 'ventas_devoluciones',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,
  },
);