import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los productos disponibles para la venta.
// No crea tablas ni implementa todavía operaciones de venta.
export const ProductoVenta = sequelize.define(
  'ProductoVenta',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Código interno opcional y único.
    sku: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },

    // Código de barras opcional y único.
    codigo_barras: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },

    // Categoría a la que pertenece el producto.
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categorias_venta',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'NO ACTION',
    },

    // Nombre visible del producto.
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Descripción opcional.
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Precio base obligatorio, con dos posiciones decimales.
    precio_venta_base: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    // Costo estimado procedente de la receta o del producto directo.
    costo_teorico: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Columna calculada por MySQL; no debemos asignarle valores.
    margen_ganancia_teorico: {
      type: DataTypes.DECIMAL(9, 2),
      allowNull: true,

      // Rechazamos las asignaciones normales mediante Sequelize.
      set() {
        throw new Error(
          'margen_ganancia_teorico es calculado por MySQL.',
        );
      },
    },

    // Dirección opcional de la imagen del producto.
    imagen_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Clasificación definida en el SQL.
    tipo_producto: {
      type: DataTypes.ENUM(
        'plato_preparado',
        'producto_directo',
        'combo',
      ),
      allowNull: true,
      defaultValue: 'plato_preparado',
    },

    // Indicador utilizado por las reglas de inventario.
    controla_stock: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    // Campo del SQL; no será una fuente independiente de inventario.
    stock_actual: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Valor mínimo definido en la tabla de productos.
    stock_minimo: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: '0.00',
    },

    // Puntos configurados para las reglas de fidelización.
    puntos_recompensa: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Estado de disponibilidad del producto.
    estado: {
      type: DataTypes.ENUM(
        'activo',
        'inactivo',
        'oculto_temporal',
      ),
      allowNull: true,
      defaultValue: 'activo',
    },

    // Insumo asociado cuando se vende un producto directo.
    insumo_directo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Fecha de creación.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de la última modificación.
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla del SQL.
    tableName: 'productos_venta',

    // Sequelize administra las fechas con estos nombres.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);