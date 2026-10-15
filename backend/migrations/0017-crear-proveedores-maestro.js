// Crear proveedores_maestro con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE proveedores_maestro (
      id INT NOT NULL AUTO_INCREMENT,

      razon_social VARCHAR(200) NOT NULL,

      ruc VARCHAR(20) UNIQUE NOT NULL,

      representante_legal VARCHAR(150) DEFAULT NULL,

      telefono_contacto VARCHAR(50) DEFAULT NULL,

      correo_contacto VARCHAR(100) DEFAULT NULL,

      dias_credito INT DEFAULT 0
        COMMENT 'Para cuentas por pagar',

      cuenta_bancaria VARCHAR(100) DEFAULT NULL,

      estado ENUM('activo', 'inactivo')
        DEFAULT 'activo',

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
  await queryInterface.sequelize.query('DROP TABLE proveedores_maestro;');
}
