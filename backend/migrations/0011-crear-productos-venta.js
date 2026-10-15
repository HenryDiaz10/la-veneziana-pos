// Crear el catálogo de productos con su estructura final.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE productos_venta (
      id INT NOT NULL AUTO_INCREMENT,

      sku VARCHAR(50) UNIQUE DEFAULT NULL,

      codigo_barras VARCHAR(100) UNIQUE DEFAULT NULL,

      categoria_id INT NOT NULL,

      nombre VARCHAR(150) NOT NULL,

      descripcion TEXT,

      precio_venta_base DECIMAL(12,2) NOT NULL,

      costo_teorico DECIMAL(12,2) DEFAULT 0.00
        COMMENT 'Suma del BOM o costo directo',

      margen_ganancia_teorico DECIMAL(9,2)
        GENERATED ALWAYS AS (
          IF(
            precio_venta_base > 0,
            (
              (precio_venta_base - costo_teorico)
              / precio_venta_base
            ) * 100,
            0
          )
        ) VIRTUAL,

      imagen_url VARCHAR(255) DEFAULT NULL,

      tipo_producto ENUM(
        'plato_preparado',
        'producto_directo',
        'combo'
      ) DEFAULT 'plato_preparado',

      controla_stock BOOLEAN DEFAULT FALSE
        COMMENT 'Gaseosas=TRUE, Pizzas=FALSE (se rigen por receta)',

      stock_actual DECIMAL(12,2) DEFAULT 0.00,

      stock_minimo DECIMAL(12,2) DEFAULT 0.00,

      puntos_recompensa INT DEFAULT 0
        COMMENT 'Puntos VIP al comprar',

      estado ENUM('activo', 'inactivo', 'oculto_temporal')
        DEFAULT 'activo',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      insumo_directo_id INT NULL,

      PRIMARY KEY (id),

      CONSTRAINT fk_prodventa_cat
        FOREIGN KEY (categoria_id)
        REFERENCES categorias_venta (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_producto_insumo_directo
        FOREIGN KEY (insumo_directo_id)
        REFERENCES insumos_almacen (id),

      CONSTRAINT ck_producto_precio
        CHECK (
          precio_venta_base >= 0
          AND costo_teorico >= 0
        )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar el catálogo al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de productos.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE productos_venta;');
}