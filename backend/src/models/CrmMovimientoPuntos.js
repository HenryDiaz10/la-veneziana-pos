import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe el historial de movimientos de puntos.
// Registrar un movimiento no actualiza automáticamente el saldo del cliente.
export const CrmMovimientoPuntos = sequelize.define(
  'CrmMovimientoPuntos',
  {
    // Identificador grande, generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Cliente al que pertenece el movimiento.
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id',
      },

      // Impide eliminar clientes con movimientos registrados.
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Clasificación del movimiento según el SQL.
    tipo_movimiento: {
      type: DataTypes.ENUM(
        'ganancia_compra',
        'canje_premio',
        'bono_manual',
        'expiracion',
      ),
      allowNull: false,
    },

    // Variación del saldo: admite cantidades positivas o negativas.
    puntos: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Venta relacionada, cuando corresponde.
    venta_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'ventas_comprobantes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Explicación opcional del movimiento.
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Identificador de la operación para controlar duplicados.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del movimiento.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'crm_movimientos_puntos',

    // Esta tabla tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    // Impide repetir un identificador de operación no nulo.
    indexes: [
      {
        name: 'uq_crm_operacion',
        unique: true,
        fields: ['operacion_uid'],
      },
    ],
  },
);