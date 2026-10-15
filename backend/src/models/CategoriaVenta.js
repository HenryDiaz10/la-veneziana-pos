import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las categorías que organizan los productos de venta.
// Definir el modelo no crea la tabla en MySQL.
export const CategoriaVenta = sequelize.define(
  'CategoriaVenta',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombre visible de la categoría.
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Identificador de texto único, por ejemplo: pizzas.
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    // Color asociado a la categoría.
    color_hex: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: '#000000',
    },

    // Posición utilizada para ordenar las categorías en pantalla.
    orden_visual: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Dirección opcional de la imagen o icono.
    icono_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Indica si la categoría participa en el flujo de cocina.
    // La lógica de envío al KDS se implementará más adelante.
    es_para_kds: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },

    // Indica si la categoría está habilitada.
    activa: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'categorias_venta',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);