// Crear crm_movimientos_puntos con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE crm_movimientos_puntos (
      id BIGINT NOT NULL AUTO_INCREMENT,

      cliente_id INT NOT NULL,

      tipo_movimiento ENUM(
        'ganancia_compra',
        'canje_premio',
        'bono_manual',
        'expiracion'
      ) NOT NULL,

      puntos INT NOT NULL
        COMMENT 'Positivo o Negativo',

      venta_id BIGINT DEFAULT NULL
        COMMENT 'Referencia cruzada',

      descripcion VARCHAR(255) DEFAULT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      operacion_uid VARCHAR(64) NULL,

      PRIMARY KEY (id),

      CONSTRAINT fk_crm_puntos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes (id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_crm_venta
        FOREIGN KEY (venta_id)
        REFERENCES ventas_comprobantes (id),

      UNIQUE KEY uq_crm_operacion (operacion_uid)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE crm_movimientos_puntos;');
}
