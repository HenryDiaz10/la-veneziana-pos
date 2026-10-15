// Crear la tabla del historial de auditoría.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE audit_logs (
      id BIGINT NOT NULL AUTO_INCREMENT,

      usuario_id INT DEFAULT NULL,

      entidad_afectada VARCHAR(100) NOT NULL
        COMMENT 'Tabla afectada',

      entidad_id BIGINT DEFAULT NULL
        COMMENT 'ID del registro modificado',

      tipo_evento ENUM(
        'INSERT',
        'UPDATE',
        'DELETE',
        'AUTH',
        'SECURITY_ALERT'
      ) NOT NULL,

      datos_anteriores JSON DEFAULT NULL,

      datos_nuevos JSON DEFAULT NULL,

      descripcion TEXT,

      ip_origen VARCHAR(45) DEFAULT NULL,

      user_agent VARCHAR(255) DEFAULT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      KEY idx_audit_fecha (created_at),

      CONSTRAINT fk_audit_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE SET NULL
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar el historial al revertir esta migración.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE audit_logs;');
}