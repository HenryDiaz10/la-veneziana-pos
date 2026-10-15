// Crear gastos_financieros_operativos con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE gastos_financieros_operativos (
      id INT NOT NULL AUTO_INCREMENT,

      categoria_id INT NOT NULL,

      descripcion VARCHAR(255) NOT NULL,

      monto_gasto DECIMAL(12,2) NOT NULL,

      fecha_gasto DATE NOT NULL,

      comprobante_fiscal VARCHAR(50) DEFAULT NULL,

      usuario_registro_id INT NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      clasificacion ENUM(
        'operativo',
        'financiero',
        'extraordinario',
        'provision_impuesto'
      ) NOT NULL DEFAULT 'operativo',

      movimiento_caja_id INT NULL,

      PRIMARY KEY (id),

      CONSTRAINT fk_gastosfijos_cat
        FOREIGN KEY (categoria_id)
        REFERENCES categorias_gastos_fijos (id),

      CONSTRAINT fk_gastosfijos_usr
        FOREIGN KEY (usuario_registro_id)
        REFERENCES usuarios (id),

      CONSTRAINT fk_gasto_movimiento
        FOREIGN KEY (movimiento_caja_id)
        REFERENCES movimientos_caja_chica (id),

      UNIQUE KEY uq_gasto_movimiento (movimiento_caja_id),

      CONSTRAINT ck_gasto_monto
        CHECK (monto_gasto >= 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE gastos_financieros_operativos;');
}
