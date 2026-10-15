import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la cabecera de una compra a proveedores.
// Definir o guardar la cabecera no incrementa inventario automáticamente.
export const CompraFactura = sequelize.define(
  'CompraFactura',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Proveedor que emitió la factura.
    proveedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'proveedores_maestro',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario que registró la compra.
    usuario_registro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Número del documento emitido por el proveedor.
    numero_factura: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Fecha de emisión, sin hora.
    fecha_emision: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Fecha opcional de vencimiento, sin hora.
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },

    // Importe antes del impuesto.
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe del impuesto; no es una tasa porcentual.
    igv: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe total del documento.
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Situación del pago según el SQL.
    estado_pago: {
      type: DataTypes.ENUM(
        'pendiente',
        'pagado_parcial',
        'pagado_total',
        'anulada',
      ),
      allowNull: true,
      defaultValue: 'pendiente',
    },

    // Estado del registro de compra, separado del pago.
    estado_registro: {
      type: DataTypes.ENUM(
        'borrador',
        'confirmada',
        'compensada',
      ),
      allowNull: false,
      defaultValue: 'borrador',
    },

    // Identificador opcional para controlar operaciones duplicadas.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del registro.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'compras_facturas',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
      {
        // Evita repetir una factura para el mismo proveedor.
        name: 'idx_compra_factura',
        unique: true,
        fields: ['proveedor_id', 'numero_factura'],
      },
      {
        // Evita repetir un identificador de operación no nulo.
        name: 'uq_compra_operacion',
        unique: true,
        fields: ['operacion_uid'],
      },
    ],
  },
);