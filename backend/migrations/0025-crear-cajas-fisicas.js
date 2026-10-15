// Crear cajas_fisicas con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE cajas_fisicas (
      id INT NOT NULL AUTO_INCREMENT,

      nombre_terminal VARCHAR(50) NOT NULL
        COMMENT 'Ej: Caja Principal 01',

      ip_maquina VARCHAR(45) DEFAULT NULL,

      estado ENUM('activa', 'mantenimiento')
        DEFAULT 'activa',

      PRIMARY KEY (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE cajas_fisicas;');
}
