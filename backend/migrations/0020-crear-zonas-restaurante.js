// Crear zonas_restaurante con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE zonas_restaurante (
      id INT NOT NULL AUTO_INCREMENT,

      nombre VARCHAR(50) NOT NULL
        COMMENT 'Ej: Terraza, 1er Piso, VIP',

      aforo_maximo INT DEFAULT 0,

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
  await queryInterface.sequelize.query('DROP TABLE zonas_restaurante;');
}
