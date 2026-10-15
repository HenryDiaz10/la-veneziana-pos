// Crear ventas_detalle_snapshot con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE ventas_detalle_snapshot (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      venta_id BIGINT NOT NULL,

      pedido_item_id BIGINT NOT NULL,

      descripcion_snapshot VARCHAR(255) NOT NULL,

      cantidad INT NOT NULL,

      precio_unitario DECIMAL(12,2) NOT NULL,

      descuento DECIMAL(12,2) NOT NULL DEFAULT 0,

      base_imponible DECIMAL(12,2) NOT NULL,

      impuesto DECIMAL(12,2) NOT NULL,

      total DECIMAL(12,2) NOT NULL,

      snapshot_json JSON NOT NULL,

      UNIQUE KEY uq_venta_item_snapshot (venta_id, pedido_item_id),

      FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id),

      FOREIGN KEY (pedido_item_id)
        REFERENCES pedido_items_kds (id),

      CHECK (
        cantidad > 0
        AND precio_unitario >= 0
        AND descuento >= 0
        AND base_imponible >= 0
        AND impuesto >= 0
        AND total >= 0
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
  await queryInterface.sequelize.query('DROP TABLE ventas_detalle_snapshot;');
}
