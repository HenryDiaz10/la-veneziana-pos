// Crear la tabla del personal con su estructura final.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE usuarios (
      id INT NOT NULL AUTO_INCREMENT,

      nombre_completo VARCHAR(150) NOT NULL,

      documento_identidad VARCHAR(20) UNIQUE DEFAULT NULL,

      email VARCHAR(100) NOT NULL UNIQUE,

      password_hash VARCHAR(255) NOT NULL,

      pin_acceso_rapido_hash VARCHAR(255) DEFAULT NULL
        COMMENT 'Para acceso rápido en POS/Tablets sin tipear correo',

      pin_autorizacion_hash VARCHAR(255) DEFAULT NULL
        COMMENT 'PIN gerencial para patrón Proxy (Anulaciones)',

      rol_id INT NOT NULL,

      avatar_url VARCHAR(255) DEFAULT NULL,

      fecha_contratacion DATE DEFAULT NULL,

      ultimo_acceso TIMESTAMP NULL DEFAULT NULL,

      estado ENUM('activo', 'suspendido', 'cesado')
        DEFAULT 'activo',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      intentos_fallidos INT NOT NULL DEFAULT 0,

      bloqueado_hasta TIMESTAMP NULL DEFAULT NULL,

      PRIMARY KEY (id),

      CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id)
        REFERENCES roles (id)
        ON DELETE RESTRICT
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de usuarios.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE usuarios;');
}