// Crear pedido_item_modificadores con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE pedido_item_modificadores (
      id BIGINT NOT NULL AUTO_INCREMENT,

      pedido_item_id BIGINT NOT NULL,

      modificador_id INT NOT NULL,

      precio_adicional_grabado DECIMAL(12,2) DEFAULT 0.00,

      PRIMARY KEY (id),

      CONSTRAINT fk_itemmod_item
        FOREIGN KEY (pedido_item_id)
        REFERENCES pedido_items_kds (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_itemmod_mod
        FOREIGN KEY (modificador_id)
        REFERENCES modificadores_items (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE pedido_item_modificadores;');
}
