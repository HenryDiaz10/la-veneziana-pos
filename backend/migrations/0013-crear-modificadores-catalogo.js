// Crear los grupos de modificadores del catálogo.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE modificadores_catalogo (
      id INT NOT NULL AUTO_INCREMENT,

      nombre_grupo VARCHAR(100) NOT NULL
        COMMENT 'Ej: Bordes de Pizza, Extras',

      es_multiple BOOLEAN DEFAULT FALSE
        COMMENT 'Permite elegir varios o solo uno',

      es_obligatorio BOOLEAN DEFAULT FALSE,

      PRIMARY KEY (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar los grupos al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ellos.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    'DROP TABLE modificadores_catalogo;'
  );
}