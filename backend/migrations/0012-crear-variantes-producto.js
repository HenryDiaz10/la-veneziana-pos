// Crear las variantes con el índice compuesto del SQL final.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE variantes_producto (
      id INT NOT NULL AUTO_INCREMENT,

      producto_id INT NOT NULL,

      nombre_variante VARCHAR(100) NOT NULL
        COMMENT 'Ej: Personal, Mediana, Familiar',

      precio_adicional DECIMAL(12,2) DEFAULT 0.00,

      costo_adicional DECIMAL(12,2) DEFAULT 0.00,

      PRIMARY KEY (id),

      UNIQUE KEY uq_variante_producto (id, producto_id),

      CONSTRAINT fk_varprod_prod
        FOREIGN KEY (producto_id)
        REFERENCES productos_venta (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar las variantes al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ellas.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE variantes_producto;');
}