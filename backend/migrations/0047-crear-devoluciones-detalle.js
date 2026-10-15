// Crear devoluciones_detalle con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE devoluciones_detalle (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      devolucion_id BIGINT NOT NULL,

      venta_detalle_id BIGINT NOT NULL,

      cantidad INT NOT NULL,

      importe DECIMAL(12,2) NOT NULL,

      restituye_stock BOOLEAN NOT NULL DEFAULT FALSE,

      FOREIGN KEY (devolucion_id)
        REFERENCES ventas_devoluciones (id),

      FOREIGN KEY (venta_detalle_id)
        REFERENCES ventas_detalle_snapshot (id),

      CHECK (
        cantidad > 0
        AND importe >= 0
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
  await queryInterface.sequelize.query('DROP TABLE devoluciones_detalle;');
}
