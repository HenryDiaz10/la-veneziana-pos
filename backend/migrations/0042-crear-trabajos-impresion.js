// Crear trabajos_impresion con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE trabajos_impresion (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      job_uid VARCHAR(64) NOT NULL UNIQUE,

      venta_id BIGINT NULL,

      pedido_id BIGINT NULL,

      sesion_id INT NULL,

      tipo ENUM(
        'ticket',
        'comanda',
        'etiqueta',
        'cierre',
        'copia'
      ) NOT NULL,

      destino VARCHAR(100) NOT NULL,

      contenido_json JSON NOT NULL,

      estado ENUM(
        'pendiente',
        'enviado',
        'confirmado',
        'error'
      ) NOT NULL DEFAULT 'pendiente',

      intentos INT NOT NULL DEFAULT 0,

      solicitado_por INT NOT NULL,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      confirmado_en TIMESTAMP NULL,

      FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id),

      FOREIGN KEY (pedido_id)
        REFERENCES pedidos_master (id),

      FOREIGN KEY (sesion_id)
        REFERENCES sesiones_caja_z (id),

      FOREIGN KEY (solicitado_por)
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
  await queryInterface.sequelize.query('DROP TABLE trabajos_impresion;');
}
