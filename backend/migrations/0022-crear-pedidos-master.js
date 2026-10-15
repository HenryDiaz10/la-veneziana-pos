// Crear pedidos_master con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE pedidos_master (
      id BIGINT NOT NULL AUTO_INCREMENT,

      codigo_pedido VARCHAR(20) UNIQUE NOT NULL,

      tipo_atencion ENUM('salon', 'llevar', 'delivery')
        NOT NULL,

      mesa_id INT DEFAULT NULL,

      cliente_id INT DEFAULT NULL,

      direccion_id INT DEFAULT NULL
        COMMENT 'Si es delivery',

      usuario_creador_id INT NOT NULL
        COMMENT 'Mesero o Cajero que originó',

      estado_cuenta ENUM(
        'abierta',
        'bloqueada_en_pago',
        'pagada',
        'anulada'
      ) DEFAULT 'abierta',

      total_preliminar DECIMAL(12,2) DEFAULT 0.00,

      notas_globales TEXT,

      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      version INT NOT NULL DEFAULT 1,

      snapshot_cliente_json JSON NULL,

      bloqueo_usuario_id INT NULL,

      bloqueo_hasta TIMESTAMP NULL,

      mesa_activa_id INT
        GENERATED ALWAYS AS (
          CASE
            WHEN estado_cuenta IN ('abierta', 'bloqueada_en_pago')
              THEN mesa_id
            ELSE NULL
          END
        ) STORED,

      PRIMARY KEY (id),

      KEY idx_pedido_estado (estado_cuenta),

      CONSTRAINT fk_pedido_mesa
        FOREIGN KEY (mesa_id)
        REFERENCES mesas_salon (id),

      CONSTRAINT fk_pedido_cli
        FOREIGN KEY (cliente_id)
        REFERENCES clientes (id),

      CONSTRAINT fk_pedido_dir
        FOREIGN KEY (direccion_id)
        REFERENCES direcciones_clientes (id),

      CONSTRAINT fk_pedido_usr
        FOREIGN KEY (usuario_creador_id)
        REFERENCES usuarios (id),

      CONSTRAINT fk_pedido_bloqueo_usuario
        FOREIGN KEY (bloqueo_usuario_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_mesa_cuenta_abierta (mesa_activa_id),

      CONSTRAINT ck_pedido_total
        CHECK (total_preliminar >= 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE pedidos_master;');
}
