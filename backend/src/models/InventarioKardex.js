import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe el historial de movimientos de inventario.
// Guardar un movimiento no actualiza automáticamente el stock del insumo.
export const InventarioKardex = sequelize.define(
  'InventarioKardex',
  {
    // Identificador grande, generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Insumo al que corresponde el movimiento.
    insumo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Determina si el movimiento representa un ingreso o una salida.
    tipo_transaccion: {
      type: DataTypes.ENUM(
        'INGRESO_COMPRA',
        'INGRESO_AJUSTE',
        'SALIDA_VENTA',
        'SALIDA_MERMA',
        'SALIDA_AJUSTE',
      ),
      allowNull: false,
    },

    // Magnitud positiva del movimiento, en la unidad base del insumo.
    cantidad: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Stock físico que queda después de aplicar el movimiento.
    saldo_posterior: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Costo por unidad base registrado para este movimiento.
    costo_unitario_transaccion: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
      defaultValue: '0.0000',
    },

    // Referencia opcional al documento que origina el movimiento.
    referencia_documento: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Usuario responsable del movimiento.
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

    // Observaciones opcionales.
    notas: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del movimiento.
    fecha_movimiento: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Identificador opcional para controlar operaciones duplicadas.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'inventario_kardex',

    // La fecha de creación utiliza el nombre del SQL.
    timestamps: true,
    createdAt: 'fecha_movimiento',
    updatedAt: false,

    indexes: [
      {
        // Facilita búsquedas por insumo.
        name: 'idx_kardex_insumo',
        fields: ['insumo_id'],
      },
      {
        // Evita repetir un identificador de operación no nulo.
        name: 'uq_kardex_operacion',
        unique: true,
        fields: ['operacion_uid'],
      },
      {
        // Facilita consultas de movimientos de un insumo por fecha.
        name: 'idx_kardex_insumo_fecha',
        fields: ['insumo_id', 'fecha_movimiento'],
      },
    ],
  },
);