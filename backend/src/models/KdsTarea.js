import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las tareas físicas de preparación.
// No publica eventos ni cambia estados o inventario automáticamente.
export const KdsTarea = sequelize.define(
  'KdsTarea',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Línea de pedido que originó la tarea.
    pedido_item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'pedido_items_kds',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Número que distingue las tareas de una misma línea.
    componente_numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Producto concreto que se prepara o despacha.
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos_venta',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Variante del producto, cuando corresponde.
    // Su referencia compuesta se creará en la migración.
    variante_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },

    // Número de unidades correspondientes a la tarea.
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Copia obligatoria de los datos necesarios para ejecutar la tarea.
    snapshot_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Estado de preparación o despacho.
    estado: {
      type: DataTypes.ENUM(
        'espera',
        'preparando',
        'horno',
        'listo_para_entrega',
        'entregado',
        'cancelado',
      ),
      allowNull: false,
      defaultValue: 'espera',
    },

    // Contador disponible para controlar cambios concurrentes.
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // Fecha inicial de la tarea.
    enviado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de inicio de preparación.
    iniciado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha de entrada al horno, si corresponde.
    horno_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha en que quedó lista para entregar.
    listo_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha de entrega.
    entregado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'kds_tareas',

    // Utilizamos la fecha inicial, sin añadir created_at.
    timestamps: true,
    createdAt: 'enviado_en',
    updatedAt: false,

    indexes: [
      {
        // Evita repetir el número de componente dentro de una línea.
        name: 'uq_tarea_componente',
        unique: true,
        fields: ['pedido_item_id', 'componente_numero'],
      },
      {
        // Facilita consultas del tablero por estado y fecha.
        name: 'idx_kds_estado_fecha',
        fields: ['estado', 'enviado_en'],
      },
    ],
  },
);