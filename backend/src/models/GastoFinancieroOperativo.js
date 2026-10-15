import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los gastos registrados por el restaurante.
// No realiza pagos ni genera movimientos de caja automáticamente.
export const GastoFinancieroOperativo = sequelize.define(
  'GastoFinancieroOperativo',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Categoría del gasto.
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categorias_gastos_fijos',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Explicación del gasto registrado.
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Importe del gasto.
    monto_gasto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Fecha del gasto, sin hora.
    fecha_gasto: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Referencia opcional al documento fiscal.
    comprobante_fiscal: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },

    // Usuario que registró el gasto.
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

    // Clasificación financiera añadida en el SQL.
    clasificacion: {
      type: DataTypes.ENUM(
        'operativo',
        'financiero',
        'extraordinario',
        'provision_impuesto',
      ),
      allowNull: false,
      defaultValue: 'operativo',
    },

    // Movimiento relacionado si el gasto fue pagado desde caja.
    movimiento_caja_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'movimientos_caja_chica',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Fecha y hora en que se registró en el sistema.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'gastos_financieros_operativos',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
      {
        // Impide vincular el mismo movimiento a varios gastos.
        name: 'uq_gasto_movimiento',
        unique: true,
        fields: ['movimiento_caja_id'],
      },
    ],
  },
);