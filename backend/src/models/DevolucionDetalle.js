import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las líneas incluidas en una devolución.
// No devuelve dinero ni repone inventario automáticamente.
export const DevolucionDetalle = sequelize.define(
  'DevolucionDetalle',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Cabecera de devolución a la que pertenece la línea.
    devolucion_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_devoluciones',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Línea comercial original que se compensa.
    venta_detalle_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'ventas_detalle_snapshot',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Número de unidades compensadas.
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Importe compensado por esta línea.
    importe: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Indicador registrado sobre restitución de stock.
    // Su valor no ejecuta movimientos de inventario.
    restituye_stock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'devoluciones_detalle',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);