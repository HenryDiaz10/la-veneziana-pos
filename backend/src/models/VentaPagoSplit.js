import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe cada pago aplicado a una venta.
// No procesa cobros ni confirma transferencias automáticamente.
export const VentaPagoSplit = sequelize.define(
  'VentaPagoSplit',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Venta a la que se aplica el pago.
    venta_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_comprobantes',
        key: 'id',
      },

      // Impide eliminar una venta con pagos registrados.
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Método de pago definido en el SQL.
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

    // Importe de este pago aplicado al total de la venta.
    monto_pagado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Efectivo entregado por el cliente, cuando corresponde.
    monto_entregado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    },

    // Cambio devuelto al cliente.
    vuelto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Referencia opcional, como el número de una operación.
    referencia_operacion: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'ventas_pagos_split',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);