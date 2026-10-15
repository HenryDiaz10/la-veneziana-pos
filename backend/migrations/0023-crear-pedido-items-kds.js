// Crear pedido_items_kds con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE pedido_items_kds (
      id BIGINT NOT NULL AUTO_INCREMENT,

      pedido_id BIGINT NOT NULL,

      producto_venta_id INT NOT NULL,

      variante_id INT DEFAULT NULL,

      cantidad INT NOT NULL DEFAULT 1,

      precio_unitario_grabado DECIMAL(12,2) NOT NULL,

      subtotal_item DECIMAL(12,2) NOT NULL,

      notas_preparacion TEXT
        COMMENT 'Ej: Sin Cebolla',

      estado_kanban ENUM(
        'espera',
        'preparando',
        'horno',
        'listo_para_entrega',
        'entregado'
      ) DEFAULT 'espera',

      fecha_envio_cocina TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        COMMENT 'Tiempo Cero KDS',

      fecha_marcado_listo TIMESTAMP NULL DEFAULT NULL,

      snapshot_item_json JSON NOT NULL,

      estado_item ENUM('activo', 'anulado')
        NOT NULL DEFAULT 'activo',

      version INT NOT NULL DEFAULT 1,

      PRIMARY KEY (id),

      CONSTRAINT fk_itemkds_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos_master (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_itemkds_prod
        FOREIGN KEY (producto_venta_id)
        REFERENCES productos_venta (id),

      CONSTRAINT fk_kds_variante_producto
        FOREIGN KEY (variante_id, producto_venta_id)
        REFERENCES variantes_producto (id, producto_id),

      CONSTRAINT ck_item_cantidad
        CHECK (cantidad > 0),

      CONSTRAINT ck_item_precio
        CHECK (
          precio_unitario_grabado >= 0
          AND subtotal_item >= 0
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
  await queryInterface.sequelize.query('DROP TABLE pedido_items_kds;');
}
