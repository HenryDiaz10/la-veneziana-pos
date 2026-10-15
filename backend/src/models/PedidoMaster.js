import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la cabecera de los pedidos.
// No crea ventas, reserva inventario ni cambia mesas automáticamente.
export const PedidoMaster = sequelize.define(
  'PedidoMaster',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Código visible, obligatorio y único.
    codigo_pedido: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    // Modalidad de atención.
    tipo_atencion: {
      type: DataTypes.ENUM('salon', 'llevar', 'delivery'),
      allowNull: false,
    },

    // Mesa relacionada, cuando corresponde.
    mesa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'mesas_salon',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Cliente relacionado, cuando corresponde.
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'clientes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Dirección utilizada para delivery.
    direccion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'direcciones_clientes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario que originó el pedido.
    usuario_creador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Estado de la cuenta, separado del estado de preparación.
    estado_cuenta: {
      type: DataTypes.ENUM(
        'abierta',
        'bloqueada_en_pago',
        'pagada',
        'anulada',
      ),
      allowNull: true,
      defaultValue: 'abierta',
    },

    // Total preliminar; el servicio calculará y validará su importe.
    total_preliminar: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Observaciones generales del pedido.
    notas_globales: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Contador disponible para el control de cambios concurrentes.
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Copia de los datos del cliente utilizados en el pedido.
    snapshot_cliente_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    // Usuario que mantiene el bloqueo temporal, cuando corresponde.
    bloqueo_usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Vencimiento del bloqueo temporal.
    bloqueo_hasta: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // MySQL calcula la mesa asociada a una cuenta abierta o en pago.
    mesa_activa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,

      // Rechazamos las asignaciones normales a la columna calculada.
      set() {
        throw new Error(
          'mesa_activa_id es calculada por MySQL.',
        );
      },
    },

    // Fecha de creación con el nombre definido en el SQL.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de la última modificación.
    actualizado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'pedidos_master',

    // Conservamos los nombres particulares de sus fechas.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en',

    indexes: [
      {
        // Facilita búsquedas por estado de cuenta.
        name: 'idx_pedido_estado',
        fields: ['estado_cuenta'],
      },
      {
        // Impide dos cuentas abiertas para la misma mesa.
        name: 'uq_mesa_cuenta_abierta',
        unique: true,
        fields: ['mesa_activa_id'],
      },
    ],
  },
);