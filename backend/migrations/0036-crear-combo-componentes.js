// Crear combo_componentes con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE combo_componentes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      combo_id INT NOT NULL,

      producto_id INT NOT NULL,

      variante_id INT NULL,

      cantidad INT NOT NULL,

      FOREIGN KEY (combo_id)
        REFERENCES productos_venta (id),

      FOREIGN KEY (producto_id)
        REFERENCES productos_venta (id),

      FOREIGN KEY (variante_id, producto_id)
        REFERENCES variantes_producto (id, producto_id),

      CHECK (
        cantidad > 0
        AND combo_id <> producto_id
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
  await queryInterface.sequelize.query('DROP TABLE combo_componentes;');
}
