// Crear categorias_gastos_fijos con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE categorias_gastos_fijos (
      id INT NOT NULL AUTO_INCREMENT,

      nombre VARCHAR(100) NOT NULL
        COMMENT 'Luz, Agua, Alquiler, Planilla',

      es_deducible_impuestos BOOLEAN DEFAULT TRUE,

      PRIMARY KEY (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE categorias_gastos_fijos;');
}
