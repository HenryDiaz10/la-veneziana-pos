// Crear modificadores_bom con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE modificadores_bom (
      modificador_id INT NOT NULL,

      insumo_id INT NOT NULL,

      delta_cantidad_base DECIMAL(12,4) NOT NULL,

      PRIMARY KEY (modificador_id, insumo_id),

      FOREIGN KEY (modificador_id)
        REFERENCES modificadores_items (id),

      FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id),

      CHECK (delta_cantidad_base <> 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE modificadores_bom;');
}
