import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los insumos reservados para una tarea.
// No reserva, consume ni libera stock automáticamente.
export const ReservaInsumo = sequelize.define(
  'ReservaInsumo',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Tarea que necesita el insumo.
    tarea_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'kds_tareas',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Insumo comprometido para la tarea.
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

    // Cantidad necesaria expresada en la unidad base del insumo.
    cantidad_base: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Estado de la reserva según el SQL.
    estado: {
      type: DataTypes.ENUM(
        'reservada',
        'consumida',
        'liberada',
      ),
      allowNull: false,
      defaultValue: 'reservada',
    },

    // Costo unitario conservado cuando corresponda.
    costo_unitario_snapshot: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
      defaultValue: null,
    },

    // Costo total conservado, con la precisión del SQL.
    costo_total_snapshot: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: true,
      defaultValue: null,
    },

    // Movimiento de Kardex relacionado con el consumo.
    kardex_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'inventario_kardex',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Clasificación del consumo para su registro y análisis.
    clasificacion_consumo: {
      type: DataTypes.ENUM('venta', 'merma', 'cortesia'),
      allowNull: false,
      defaultValue: 'venta',
    },

    // Fecha y hora de creación de la reserva.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Fecha en que se registró el consumo.
    consumido_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'reservas_insumos',

    // Utilizamos la fecha del SQL, sin añadir created_at.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,

    indexes: [
      {
        // Una reserva por combinación de tarea e insumo.
        name: 'uq_reserva_tarea_insumo',
        unique: true,
        fields: ['tarea_id', 'insumo_id'],
      },
      {
        // Un movimiento de Kardex no se vincula a varias reservas.
        name: 'uq_reserva_kardex',
        unique: true,
        fields: ['kardex_id'],
      },
    ],
  },
);