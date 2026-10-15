// Crear ventas_pagos_split con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE ventas_pagos_split (
      id BIGINT NOT NULL AUTO_INCREMENT,

      venta_id BIGINT NOT NULL,

      metodo_pago ENUM(
        'efectivo',
        'tarjeta_debito',
        'tarjeta_credito',
        'yape',
        'plin',
        'transferencia',
        'puntos_vip',
        'cortesia'
      ) NOT NULL,

      monto_pagado DECIMAL(12,2) NOT NULL,

      monto_entregado DECIMAL(12,2) DEFAULT NULL
        COMMENT 'Billetes entregados',

      vuelto DECIMAL(12,2) DEFAULT 0.00,

      referencia_operacion VARCHAR(100) DEFAULT NULL
        COMMENT 'Voucher POS',

      PRIMARY KEY (id),

      CONSTRAINT fk_pagosplit_venta
        FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id)
        ON DELETE RESTRICT,

      CONSTRAINT ck_pago_montos
        CHECK (
          monto_pagado >= 0
          AND vuelto >= 0
          AND (monto_entregado IS NULL OR monto_entregado >= 0)
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
  await queryInterface.sequelize.query('DROP TABLE ventas_pagos_split;');
}
