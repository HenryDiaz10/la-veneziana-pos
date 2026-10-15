// Crear el registro de clientes con sus 15 campos.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE clientes (
      id INT NOT NULL AUTO_INCREMENT,

      nombres VARCHAR(150) NOT NULL,

      apellidos VARCHAR(150) DEFAULT NULL,

      tipo_documento ENUM('DNI', 'CE', 'PASAPORTE', 'RUC')
        DEFAULT 'DNI',

      numero_documento VARCHAR(20) UNIQUE DEFAULT NULL,

      telefono_principal VARCHAR(20) DEFAULT NULL,

      email VARCHAR(100) DEFAULT NULL,

      fecha_nacimiento DATE DEFAULT NULL,

      puntos_vip_actuales INT DEFAULT 0,

      puntos_vip_historicos INT DEFAULT 0,

      nivel_vip ENUM('Nuevo', 'Bronce', 'Plata', 'Oro', 'Black')
        DEFAULT 'Nuevo',

      notas_internas TEXT
        COMMENT 'Ej: Alérgico a los mariscos',

      estado ENUM('activo', 'lista_negra')
        DEFAULT 'activo',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      KEY idx_clientes_doc (numero_documento),

      KEY idx_clientes_tel (telefono_principal)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de clientes.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE clientes;');
}