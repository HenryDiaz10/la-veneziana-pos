import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las líneas de un pedido y su información de preparación.
// No crea tareas de cocina ni consume inventario automáticamente.
export const PedidoItemKds = sequelize.define(
  'PedidoItemKds',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Pedido al que pertenece esta línea.
    pedido_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'pedidos_master',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Producto solicitado.
    producto_venta_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Variante seleccionada, cuando corresponde.
    // Su referencia compuesta se creará en la migración.
    variante_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },

    // Número de unidades solicitadas.
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Precio unitario conservado al registrar la línea.
    precio_unitario_grabado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Importe de la línea, calculado por el servicio.
    subtotal_item: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Indicaciones para la preparación.
    notas_preparacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Resumen del estado de preparación según el SQL.
    estado_kanban: {
      type: DataTypes.ENUM(
        'espera',
        'preparando',
        'horno',
        'listo_para_entrega',
        'entregado',
      ),
      allowNull: true,
      defaultValue: 'espera',
    },

    // Fecha inicial definida en el SQL para el flujo de cocina.
    fecha_envio_cocina: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Se completará cuando se marque la preparación como lista.
    fecha_marcado_listo: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Copia obligatoria de los datos utilizados para esta línea.
    snapshot_item_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Estado de la línea, separado de su preparación.
    estado_item: {
      type: DataTypes.ENUM('activo', 'anulado'),
      allowNull: false,
      defaultValue: 'activo',
    },

    // Contador disponible para controlar cambios concurrentes.
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'pedido_items_kds',

    // Utilizamos la fecha inicial del SQL, sin añadir created_at.
    timestamps: true,
    createdAt: 'fecha_envio_cocina',
    updatedAt: false,
  },
);