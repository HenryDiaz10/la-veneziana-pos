// Crear kds_historial con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE kds_historial (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      tarea_id BIGINT NOT NULL,

      usuario_id INT NOT NULL,

      estado_anterior VARCHAR(30) NOT NULL,

      estado_nuevo VARCHAR(30) NOT NULL,

      version INT NOT NULL,

      operacion_uid VARCHAR(64) NOT NULL UNIQUE,

      motivo VARCHAR(500) NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (tarea_id)
        REFERENCES kds_tareas (id),

      FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_historial_tarea_version (tarea_id, version)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE kds_historial;');
}
