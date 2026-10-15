import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la venta asociada a un pedido.
// No cobra, calcula impuestos ni emite documentos fiscales automáticamente.
export const VentaComprobante = sequelize.define(
  'VentaComprobante',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Pedido cobrado; solo puede tener una venta asociada.
    pedido_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: {
        model: 'pedidos_master',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Sesión de caja en la que se registra la venta.
    sesion_caja_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sesiones_caja_z',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario responsable del cobro.
    cajero_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Clasificación del documento según el SQL.
    tipo_documento_fiscal: {
      type: DataTypes.ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito',
      ),
      allowNull: true,
      defaultValue: 'ticket_interno',
    },

    // Serie y correlativo del documento, obligatorios y únicos.
    serie_correlativo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    // Campo de compatibilidad previsto en el SQL.
    // El documento y estado fiscal se gestionarán en ComprobanteFiscal.
    hash_sunat: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Base gravada registrada para la venta.
    subtotal_gravado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe total del impuesto; no representa una tasa.
    igv_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Descuento global aplicado.
    descuento_global: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Importe final de la venta.
    total_final_venta: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Estado registrado según el SQL.
    estado_emision: {
      type: DataTypes.ENUM(
        'emitida',
        'rechazada_sunat',
        'anulada',
      ),
      allowNull: true,
      defaultValue: 'emitida',
    },

    // Fecha y hora de creación de la venta.
    fecha_emision: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Copia obligatoria de los datos fiscales aplicados.
    snapshot_fiscal_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Identificador obligatorio para controlar operaciones duplicadas.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'ventas_comprobantes',

    // Utilizamos la fecha del SQL, sin añadir created_at.
    timestamps: true,
    createdAt: 'fecha_emision',
    updatedAt: false,

    indexes: [
      {
        // Facilita búsquedas por fecha.
        name: 'idx_ventas_fecha',
        fields: ['fecha_emision'],
      },
      {
        // Impide registrar dos ventas con la misma operación.
        name: 'uq_venta_operacion',
        unique: true,
        fields: ['operacion_uid'],
      },
    ],
  },
);