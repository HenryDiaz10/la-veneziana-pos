// Crear autorizaciones_sensibles con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE autorizaciones_sensibles (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      actor_id INT NOT NULL,

      aprobador_id INT NOT NULL,

      accion VARCHAR(80) NOT NULL,

      entidad VARCHAR(80) NOT NULL,

      entidad_id BIGINT NOT NULL,

      motivo VARCHAR(500) NOT NULL,

      expira_en TIMESTAMP NOT NULL,

      consumida_en TIMESTAMP NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (actor_id)
        REFERENCES usuarios (id),

      FOREIGN KEY (aprobador_id)
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
  await queryInterface.sequelize.query('DROP TABLE autorizaciones_sensibles;');
}
