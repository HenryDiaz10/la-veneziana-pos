import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los cambios de ingredientes asociados a un modificador.
// No modifica recetas ni descuenta inventario automáticamente.
export const ModificadorBom = sequelize.define(
  'ModificadorBom',
  {
    // Opción del catálogo que añade o retira el ingrediente.
    modificador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'modificadores_items',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Insumo cuya cantidad cambia.
    insumo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Variación expresada en la unidad base del insumo.
    // Positiva: añade cantidad. Negativa: retira cantidad.
    delta_cantidad_base: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'modificadores_bom',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);