// Crear compras_facturas con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE compras_facturas (
      id INT NOT NULL AUTO_INCREMENT,

      proveedor_id INT NOT NULL,

      usuario_registro_id INT NOT NULL,

      numero_factura VARCHAR(50) NOT NULL,

      fecha_emision DATE NOT NULL,

      fecha_vencimiento DATE DEFAULT NULL,

      subtotal DECIMAL(12,2) NOT NULL,

      igv DECIMAL(12,2) NOT NULL,

      total DECIMAL(12,2) NOT NULL,

      estado_pago ENUM(
        'pendiente',
        'pagado_parcial',
        'pagado_total',
        'anulada'
      ) DEFAULT 'pendiente',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      estado_registro ENUM('borrador', 'confirmada', 'compensada')
        NOT NULL DEFAULT 'borrador',

      operacion_uid VARCHAR(64) NULL,

      PRIMARY KEY (id),

      UNIQUE KEY idx_compra_factura (proveedor_id, numero_factura),

      CONSTRAINT fk_compras_prov
        FOREIGN KEY (proveedor_id)
        REFERENCES proveedores_maestro (id),

      CONSTRAINT fk_compras_usr
        FOREIGN KEY (usuario_registro_id)
        REFERENCES usuarios (id),

      UNIQUE KEY uq_compra_operacion (operacion_uid)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE compras_facturas;');
}
