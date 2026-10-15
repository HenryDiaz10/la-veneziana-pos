// Crear inventario_kardex con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE inventario_kardex (
      id BIGINT NOT NULL AUTO_INCREMENT,

      insumo_id INT NOT NULL,

      tipo_transaccion ENUM(
        'INGRESO_COMPRA',
        'INGRESO_AJUSTE',
        'SALIDA_VENTA',
        'SALIDA_MERMA',
        'SALIDA_AJUSTE'
      ) NOT NULL,

      cantidad DECIMAL(12,4) NOT NULL
        COMMENT 'Monto exacto movido',

      saldo_posterior DECIMAL(12,4) NOT NULL
        COMMENT 'Fotografía del stock después del movimiento',

      costo_unitario_transaccion DECIMAL(12,4) DEFAULT 0.0000,

      referencia_documento VARCHAR(100) DEFAULT NULL
        COMMENT 'Ej: ID Compra o ID Venta',

      usuario_id INT NOT NULL,

      notas VARCHAR(255) DEFAULT NULL,

      fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      operacion_uid VARCHAR(64) NULL,

      PRIMARY KEY (id),

      KEY idx_kardex_insumo (insumo_id),

      CONSTRAINT fk_kardex_insumo
        FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id),

      CONSTRAINT fk_kardex_usr
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_kardex_operacion (operacion_uid),

      KEY idx_kardex_insumo_fecha (insumo_id, fecha_movimiento),

      CONSTRAINT ck_kardex_positivo
        CHECK (
          cantidad > 0
          AND saldo_posterior >= 0
          AND costo_unitario_transaccion >= 0
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
  await queryInterface.sequelize.query('DROP TABLE inventario_kardex;');
}
