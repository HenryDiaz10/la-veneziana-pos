// Crear ventas_comprobantes con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE ventas_comprobantes (
      id BIGINT NOT NULL AUTO_INCREMENT,

      pedido_id BIGINT UNIQUE NOT NULL
        COMMENT 'Relación 1 a 1 estricta',

      sesion_caja_id INT NOT NULL,

      cajero_id INT NOT NULL,

      tipo_documento_fiscal ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito'
      ) DEFAULT 'ticket_interno',

      serie_correlativo VARCHAR(20) UNIQUE NOT NULL
        COMMENT 'Ej: B001-000458',

      hash_sunat VARCHAR(255) DEFAULT NULL
        COMMENT 'Dato de compatibilidad; el documento y estado fiscal viven en comprobantes_fiscales',

      subtotal_gravado DECIMAL(12,2) NOT NULL,

      igv_total DECIMAL(12,2) NOT NULL,

      descuento_global DECIMAL(12,2) DEFAULT 0.00,

      total_final_venta DECIMAL(12,2) NOT NULL,

      estado_emision ENUM('emitida', 'rechazada_sunat', 'anulada')
        DEFAULT 'emitida',

      fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      snapshot_fiscal_json JSON NOT NULL,

      operacion_uid VARCHAR(64) NOT NULL,

      PRIMARY KEY (id),

      KEY idx_ventas_fecha (fecha_emision),

      CONSTRAINT fk_venta_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos_master (id),

      CONSTRAINT fk_venta_sesion
        FOREIGN KEY (sesion_caja_id)
        REFERENCES sesiones_caja_z (id),

      CONSTRAINT fk_venta_cajero
        FOREIGN KEY (cajero_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_venta_operacion (operacion_uid),

      CONSTRAINT ck_venta_importes
        CHECK (
          subtotal_gravado >= 0
          AND igv_total >= 0
          AND descuento_global >= 0
          AND total_final_venta >= 0
        )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE ventas_comprobantes;');
}
