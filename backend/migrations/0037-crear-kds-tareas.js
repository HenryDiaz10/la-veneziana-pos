// Crear kds_tareas con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE kds_tareas (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      pedido_item_id BIGINT NOT NULL,

      componente_numero INT NOT NULL DEFAULT 1,

      producto_id INT NOT NULL,

      variante_id INT NULL,

      cantidad INT NOT NULL,

      snapshot_json JSON NOT NULL,

      estado ENUM(
        'espera',
        'preparando',
        'horno',
        'listo_para_entrega',
        'entregado',
        'cancelado'
      ) NOT NULL DEFAULT 'espera',

      version INT NOT NULL DEFAULT 1,

      enviado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      iniciado_en TIMESTAMP NULL,

      horno_en TIMESTAMP NULL,

      listo_en TIMESTAMP NULL,

      entregado_en TIMESTAMP NULL,

      UNIQUE KEY uq_tarea_componente (pedido_item_id, componente_numero),

      KEY idx_kds_estado_fecha (estado, enviado_en),

      FOREIGN KEY (pedido_item_id)
        REFERENCES pedido_items_kds (id),

      FOREIGN KEY (producto_id)
        REFERENCES productos_venta (id),

      FOREIGN KEY (variante_id, producto_id)
        REFERENCES variantes_producto (id, producto_id),

      CHECK (
        cantidad > 0
        AND componente_numero > 0
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
  await queryInterface.sequelize.query('DROP TABLE kds_tareas;');
}
