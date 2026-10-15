// Crear eventos_outbox con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE eventos_outbox (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      event_uid VARCHAR(64) NOT NULL UNIQUE,

      tipo VARCHAR(80) NOT NULL,

      entidad VARCHAR(80) NOT NULL,

      entidad_id BIGINT NOT NULL,

      version INT NOT NULL,

      sala_destino VARCHAR(100) NOT NULL,

      payload_json JSON NOT NULL,

      intentos INT NOT NULL DEFAULT 0,

      proximo_intento_en TIMESTAMP NULL,

      publicado_en TIMESTAMP NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      KEY idx_outbox_pendientes (publicado_en, proximo_intento_en, id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE eventos_outbox;');
}
