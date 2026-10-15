// Crear recetas_bom_master con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE recetas_bom_master (
      id INT NOT NULL AUTO_INCREMENT,

      producto_venta_id INT NOT NULL,

      variante_id INT DEFAULT NULL
        COMMENT 'Por si la receta es solo de la Pizza Familiar',

      insumo_id INT NOT NULL,

      cantidad_bruta_necesaria DECIMAL(12,4) NOT NULL,

      porcentaje_merma_esperado DECIMAL(5,2) DEFAULT 0.00,

      variante_clave INT
        GENERATED ALWAYS AS (
          COALESCE(variante_id, 0)
        ) STORED,

      PRIMARY KEY (id),

      CONSTRAINT fk_bom_producto
        FOREIGN KEY (producto_venta_id)
        REFERENCES productos_venta (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_bom_variante
        FOREIGN KEY (variante_id)
        REFERENCES variantes_producto (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_bom_insumo
        FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id)
        ON DELETE RESTRICT,

      UNIQUE KEY uq_bom_producto_variante_insumo (producto_venta_id, variante_clave, insumo_id),

      CONSTRAINT fk_bom_variante_producto
        FOREIGN KEY (variante_id, producto_venta_id)
        REFERENCES variantes_producto (id, producto_id),

      CONSTRAINT ck_bom_cantidad
        CHECK (cantidad_bruta_necesaria > 0),

      CONSTRAINT ck_bom_merma
        CHECK (
          porcentaje_merma_esperado >= 0
          AND porcentaje_merma_esperado < 100
        )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE recetas_bom_master;');
}
