import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los modificadores seleccionados para una línea del pedido.
export const PedidoItemModificador = sequelize.define(
  'PedidoItemModificador',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Línea del pedido a la que pertenece la selección.
    pedido_item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'pedido_items_kds',
        key: 'id',
      },

      // Impide eliminar una línea con modificadores registrados.
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Opción seleccionada del catálogo de modificadores.
    modificador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modificadores_items',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Precio adicional conservado al registrar la selección.
    precio_adicional_grabado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'pedido_item_modificadores',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);