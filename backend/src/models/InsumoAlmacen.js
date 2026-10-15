import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los insumos y sus saldos de inventario.
// Los movimientos y reservas se implementarán en los servicios.
export const InsumoAlmacen = sequelize.define(
  'InsumoAlmacen',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Código interno opcional y único.
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },

    // Nombre del ingrediente o artículo.
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Unidad base utilizada para cantidades y costos.
    unidad_medida_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'unidades_medida',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Costo promedio por unidad base.
    costo_promedio: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: '0.0000',
    },

    // Último costo registrado por unidad base.
    ultimo_costo: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: '0.0000',
    },

    // Cantidad física existente en almacén.
    stock_fisico: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: '0.0000',
    },

    // Umbral utilizado para advertir un stock bajo.
    stock_minimo_alerta: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: '0.0000',
    },

    // Indica si el insumo es perecible.
    perecible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },

    // Indica si el insumo está habilitado.
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },

    // Parte del stock físico comprometida en pedidos.
    stock_reservado: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: '0.0000',
    },

    // Marca una falta de disponibilidad declarada.
    quiebre_declarado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'insumos_almacen',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);