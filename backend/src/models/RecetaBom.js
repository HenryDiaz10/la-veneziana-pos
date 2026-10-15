import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Cada registro representa un insumo necesario para una receta.
// No reserva ni descuenta inventario automáticamente.
export const RecetaBom = sequelize.define(
  'RecetaBom',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Producto al que pertenece la receta.
    producto_venta_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Variante específica; NULL representa la receta base.
    variante_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'variantes_producto',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Insumo utilizado por la receta.
    insumo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Cantidad bruta expresada en la unidad base del insumo.
    cantidad_bruta_necesaria: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },

    // Porcentaje de merma esperado.
    porcentaje_merma_esperado: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // MySQL calcula COALESCE(variante_id, 0).
    // No asignamos valores directamente a esta columna.
    variante_clave: {
      type: DataTypes.INTEGER,
      allowNull: true,

      // Rechazamos las asignaciones normales mediante Sequelize.
      set() {
        throw new Error(
          'variante_clave es calculada por MySQL.',
        );
      },
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'recetas_bom_master',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,

    // Evita repetir un insumo en la misma receta base o de variante.
    indexes: [
      {
        name: 'uq_bom_producto_variante_insumo',
        unique: true,
        fields: [
          'producto_venta_id',
          'variante_clave',
          'insumo_id',
        ],
      },
    ],
  },
);