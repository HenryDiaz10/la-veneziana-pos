// Crear auth_sesiones con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE auth_sesiones (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      usuario_id INT NOT NULL,

      session_uid VARCHAR(64) NOT NULL UNIQUE,

      refresh_hash CHAR(64) NULL,

      expira_en TIMESTAMP NOT NULL,

      revocada_en TIMESTAMP NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE auth_sesiones;');
}
