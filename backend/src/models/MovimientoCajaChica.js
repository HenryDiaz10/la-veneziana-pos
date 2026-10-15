import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe ingresos y egresos de efectivo de una sesión.
// No modifica saldos ni autoriza operaciones automáticamente.
export const MovimientoCajaChica = sequelize.define(
  'MovimientoCajaChica',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Sesión de caja a la que pertenece el movimiento.
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

    // Dirección del movimiento de efectivo.
    tipo: {
      type: DataTypes.ENUM('ingreso', 'egreso'),
      allowNull: false,
    },

    // Magnitud positiva del movimiento.
    monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Motivo del ingreso o egreso.
    concepto: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Referencia opcional al documento de respaldo.
    comprobante_respaldo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Usuario que autorizó la operación, cuando corresponde.
    autorizado_por: {
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

    // Fecha y hora de creación del movimiento.
    fecha_hora: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Identificador obligatorio para controlar operaciones duplicadas.
    operacion_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'movimientos_caja_chica',

    // Utilizamos la fecha del SQL, sin añadir created_at.
    timestamps: true,
    createdAt: 'fecha_hora',
    updatedAt: false,

    indexes: [
      {
        // Impide registrar dos movimientos con la misma operación.
        name: 'uq_movimiento_operacion',
        unique: true,
        fields: ['operacion_uid'],
      },
    ],
  },
);