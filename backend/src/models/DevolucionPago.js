import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los desembolsos asociados a una devolución.
// No entrega efectivo ni procesa reembolsos automáticamente.
export const DevolucionPago = sequelize.define(
  'DevolucionPago',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Devolución a la que corresponde el desembolso.
    devolucion_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_devoluciones',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Sesión de caja utilizada para registrar el desembolso.
    sesion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sesiones_caja_z',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Método registrado según el SQL.
    metodo_pago: {
      type: DataTypes.ENUM(
        'efectivo',
        'tarjeta_debito',
        'tarjeta_credito',
        'yape',
        'plin',
        'transferencia',
        'puntos_vip',
        'cortesia',
      ),
      allowNull: false,
    },

    // Importe positivo del desembolso.
    monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Referencia opcional de la operación.
    referencia: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'devoluciones_pagos',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);