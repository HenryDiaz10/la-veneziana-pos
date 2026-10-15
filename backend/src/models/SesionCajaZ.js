import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los turnos y cierres de caja.
// No calcula saldos ni cierra sesiones automáticamente.
export const SesionCajaZ = sequelize.define(
  'SesionCajaZ',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Terminal física utilizada durante el turno.
    caja_fisica_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cajas_fisicas',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Usuario responsable del turno.
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

    // Fecha y hora de apertura.
    apertura_fecha: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Efectivo inicial de la sesión.
    apertura_monto_base: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Fecha de cierre; permanece vacía mientras corresponda.
    cierre_fecha: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Efectivo que debería existir según las operaciones registradas.
    cierre_teorico_efectivo: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Efectivo contado físicamente al cerrar.
    cierre_real_efectivo: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Diferencia registrada entre el efectivo real y el teórico.
    descuadre_monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Copia de los datos consolidados al realizar el cierre.
    snapshot_memento_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    // Estado de la sesión según el SQL.
    estado_sesion: {
      type: DataTypes.ENUM('abierta', 'cerrada', 'auditada'),
      allowNull: true,
      defaultValue: 'abierta',
    },

    // MySQL identifica la caja únicamente mientras la sesión está abierta.
    caja_abierta_id: {
      type: DataTypes.INTEGER,
      allowNull: true,

      // Rechazamos las asignaciones normales a la columna calculada.
      set() {
        throw new Error(
          'caja_abierta_id es calculada por MySQL.',
        );
      },
    },

    // MySQL identifica al cajero mientras la sesión está abierta.
    cajero_abierto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,

      // Rechazamos las asignaciones normales a la columna calculada.
      set() {
        throw new Error(
          'cajero_abierto_id es calculada por MySQL.',
        );
      },
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'sesiones_caja_z',

    // La fecha de creación utiliza el campo de apertura.
    timestamps: true,
    createdAt: 'apertura_fecha',
    updatedAt: false,

    indexes: [
      {
        // Impide dos sesiones abiertas para la misma caja.
        name: 'uq_caja_abierta',
        unique: true,
        fields: ['caja_abierta_id'],
      },
      {
        // Impide dos sesiones abiertas para el mismo cajero.
        name: 'uq_cajero_abierto',
        unique: true,
        fields: ['cajero_abierto_id'],
      },
    ],
  },
);