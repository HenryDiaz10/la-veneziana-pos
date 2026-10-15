// Crear movimientos_caja_chica con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE movimientos_caja_chica (
      id INT NOT NULL AUTO_INCREMENT,

      sesion_id INT NOT NULL,

      tipo ENUM('ingreso', 'egreso')
        NOT NULL,

      monto DECIMAL(12,2) NOT NULL,

      concepto VARCHAR(255) NOT NULL
        COMMENT 'Ej: Compra urgente hielo',

      comprobante_respaldo VARCHAR(100) DEFAULT NULL,

      autorizado_por INT DEFAULT NULL
        COMMENT 'ID Administrador si requiere permiso',

      fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      operacion_uid VARCHAR(64) NOT NULL,

      PRIMARY KEY (id),

      CONSTRAINT fk_movcaja_sesion
        FOREIGN KEY (sesion_id)
        REFERENCES sesiones_caja_z (id),

      CONSTRAINT fk_movcaja_auth
        FOREIGN KEY (autorizado_por)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_movimiento_operacion (operacion_uid),

      CONSTRAINT ck_caja_monto
        CHECK (monto > 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE movimientos_caja_chica;');
}
