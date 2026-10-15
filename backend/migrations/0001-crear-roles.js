// Crear la tabla de roles.
// context es el QueryInterface entregado por migrator.js.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE roles (
      id INT NOT NULL AUTO_INCREMENT,

      nombre VARCHAR(50) NOT NULL UNIQUE
        COMMENT 'Ej: administrador, cajero, mesero, cocinero',

      descripcion VARCHAR(150) DEFAULT NULL,

      is_system BOOLEAN DEFAULT FALSE
        COMMENT 'Evita que el rol sea borrado',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Revertir esta migración elimina la tabla y sus registros.
// Las migraciones posteriores que dependan de roles
// deberán revertirse primero.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE roles;');
}