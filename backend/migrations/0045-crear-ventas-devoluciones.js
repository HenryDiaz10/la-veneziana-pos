// Crear ventas_devoluciones con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE ventas_devoluciones (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      venta_id BIGINT NOT NULL,

      usuario_id INT NOT NULL,

      autorizador_id INT NOT NULL,

      motivo VARCHAR(500) NOT NULL,

      total DECIMAL(12,2) NOT NULL,

      operacion_uid VARCHAR(64) NOT NULL UNIQUE,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id),

      FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id),

      FOREIGN KEY (autorizador_id)
        REFERENCES usuarios (id),

      CHECK (total > 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE ventas_devoluciones;');
}
