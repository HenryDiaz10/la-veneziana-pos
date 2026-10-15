// Crear comprobantes_fiscales con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE comprobantes_fiscales (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      venta_id BIGINT NOT NULL,

      documento_afectado_id BIGINT NULL,

      tipo ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito'
      ) NOT NULL,

      serie VARCHAR(10) NOT NULL,

      numero BIGINT NOT NULL,

      estado ENUM(
        'pendiente',
        'enviado',
        'aceptado',
        'observado',
        'rechazado',
        'error'
      ) NOT NULL DEFAULT 'pendiente',

      snapshot_json JSON NOT NULL,

      xml_uri VARCHAR(500) NULL,

      respuesta_uri VARCHAR(500) NULL,

      hash_documento VARCHAR(255) NULL,

      operacion_uid VARCHAR(64) NOT NULL UNIQUE,

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      devolucion_id BIGINT NULL,

      UNIQUE KEY uq_documento_tipo_serie_numero (tipo, serie, numero),

      FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id),

      FOREIGN KEY (documento_afectado_id)
        REFERENCES comprobantes_fiscales (id),

      CHECK (numero > 0),

      CHECK (tipo <> 'nota_credito' OR documento_afectado_id IS NOT NULL),

      CONSTRAINT fk_fiscal_devolucion
        FOREIGN KEY (devolucion_id)
        REFERENCES ventas_devoluciones (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE comprobantes_fiscales;');
}
