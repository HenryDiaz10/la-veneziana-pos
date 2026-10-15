// Crear el catálogo de unidades de medida.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE unidades_medida (
      id INT NOT NULL AUTO_INCREMENT,

      nombre VARCHAR(50) NOT NULL
        COMMENT 'Kilogramo, Litro, Unidad',

      abreviatura VARCHAR(10) NOT NULL
        COMMENT 'kg, L, un',

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
  await queryInterface.sequelize.query('DROP TABLE unidades_medida;');
}