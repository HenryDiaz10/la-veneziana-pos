// Crear producto_modificadores con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE producto_modificadores (
      producto_id INT NOT NULL,

      grupo_id INT NOT NULL,

      PRIMARY KEY (producto_id, grupo_id),

      CONSTRAINT fk_prodmod_prod
        FOREIGN KEY (producto_id)
        REFERENCES productos_venta (id)
        ON DELETE CASCADE,

      CONSTRAINT fk_prodmod_grupo
        FOREIGN KEY (grupo_id)
        REFERENCES modificadores_catalogo (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE producto_modificadores;');
}
