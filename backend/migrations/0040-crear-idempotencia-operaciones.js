// Crear idempotencia_operaciones con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE idempotencia_operaciones (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      usuario_id INT NOT NULL,

      tipo_operacion VARCHAR(80) NOT NULL,

      clave VARCHAR(64) NOT NULL,

      request_hash CHAR(64) NOT NULL,

      estado ENUM('procesando', 'confirmada')
        NOT NULL,

      http_status SMALLINT NULL,

      respuesta_json JSON NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uq_idempotencia (usuario_id, tipo_operacion, clave),

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
  await queryInterface.sequelize.query('DROP TABLE idempotencia_operaciones;');
}
