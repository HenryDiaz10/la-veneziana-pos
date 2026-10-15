// Crear devoluciones_pagos con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE devoluciones_pagos (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      devolucion_id BIGINT NOT NULL,

      sesion_id INT NOT NULL,

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

      monto DECIMAL(12,2) NOT NULL,

      referencia VARCHAR(100) NULL,

      FOREIGN KEY (devolucion_id)
        REFERENCES ventas_devoluciones (id),

      FOREIGN KEY (sesion_id)
        REFERENCES sesiones_caja_z (id),

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
  await queryInterface.sequelize.query('DROP TABLE devoluciones_pagos;');
}
