// Crear sesiones_caja_z con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE sesiones_caja_z (
      id INT NOT NULL AUTO_INCREMENT,

      caja_fisica_id INT NOT NULL,

      cajero_id INT NOT NULL,

      apertura_fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      apertura_monto_base DECIMAL(12,2) NOT NULL,

      cierre_fecha TIMESTAMP NULL DEFAULT NULL,

      cierre_teorico_efectivo DECIMAL(12,2) DEFAULT 0.00,

      cierre_real_efectivo DECIMAL(12,2) DEFAULT 0.00,

      descuadre_monto DECIMAL(12,2) DEFAULT 0.00,

      snapshot_memento_json JSON DEFAULT NULL
        COMMENT 'Copia inmutable de saldos de tarjetas al cerrar',

      estado_sesion ENUM('abierta', 'cerrada', 'auditada')
        DEFAULT 'abierta',

      caja_abierta_id INT
        GENERATED ALWAYS AS (
          CASE
            WHEN estado_sesion='abierta'
              THEN caja_fisica_id
            ELSE NULL
          END
        ) STORED,

      cajero_abierto_id INT
        GENERATED ALWAYS AS (
          CASE
            WHEN estado_sesion='abierta'
              THEN cajero_id
            ELSE NULL
          END
        ) STORED,

      PRIMARY KEY (id),

      CONSTRAINT fk_sesion_caja
        FOREIGN KEY (caja_fisica_id)
        REFERENCES cajas_fisicas (id),

      CONSTRAINT fk_sesion_cajero
        FOREIGN KEY (cajero_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_caja_abierta (caja_abierta_id),

      UNIQUE KEY uq_cajero_abierto (cajero_abierto_id),

      CONSTRAINT ck_apertura
        CHECK (apertura_monto_base >= 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE sesiones_caja_z;');
}
