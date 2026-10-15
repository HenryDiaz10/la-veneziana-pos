// Crear el catálogo de permisos del sistema.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE permisos (
      id INT NOT NULL AUTO_INCREMENT,

      modulo VARCHAR(50) NOT NULL
        COMMENT 'Ej: ventas, inventario, configuracion',

      accion VARCHAR(50) NOT NULL
        COMMENT 'Ej: crear, leer, actualizar, eliminar, anular',

      descripcion VARCHAR(150) DEFAULT NULL,

      PRIMARY KEY (id),

      UNIQUE KEY idx_modulo_accion (modulo, accion)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar el catálogo al revertir esta migración.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE permisos;');
}