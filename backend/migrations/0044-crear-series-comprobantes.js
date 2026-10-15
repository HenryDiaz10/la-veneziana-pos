// Crear series_comprobantes con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE series_comprobantes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      tipo ENUM(
        'ticket_interno',
        'boleta_electronica',
        'factura_electronica',
        'nota_credito'
      ) NOT NULL,

      serie VARCHAR(10) NOT NULL,

      siguiente_numero BIGINT NOT NULL DEFAULT 1,

      activa BOOLEAN NOT NULL DEFAULT TRUE,

      UNIQUE KEY uq_tipo_serie (tipo, serie),

      CHECK (siguiente_numero > 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE series_comprobantes;');
}
