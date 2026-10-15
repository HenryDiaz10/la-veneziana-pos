// Crear compras_detalle con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE compras_detalle (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      compra_id INT NOT NULL,

      insumo_id INT NOT NULL,

      cantidad_base DECIMAL(12,4) NOT NULL,

      costo_unitario DECIMAL(12,4) NOT NULL,

      subtotal DECIMAL(12,2) NOT NULL,

      FOREIGN KEY (compra_id)
        REFERENCES compras_facturas (id),

      FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id),

      CHECK (
        cantidad_base > 0
        AND costo_unitario >= 0
        AND subtotal >= 0
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
  await queryInterface.sequelize.query('DROP TABLE compras_detalle;');
}
