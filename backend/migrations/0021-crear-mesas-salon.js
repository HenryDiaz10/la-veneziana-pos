// Crear mesas_salon con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE mesas_salon (
      id INT NOT NULL AUTO_INCREMENT,

      zona_id INT NOT NULL,

      codigo_mesa VARCHAR(10) NOT NULL UNIQUE,

      capacidad_sillas INT DEFAULT 4,

      estado_actual ENUM(
        'libre',
        'ocupada',
        'sucia_por_limpiar',
        'inhabilitada'
      ) DEFAULT 'libre',

      mesero_asignado_id INT DEFAULT NULL
        COMMENT 'Responsable actual para Observer UI',

      posicion_x INT DEFAULT 0
        COMMENT 'Para diseño de croquis',

      posicion_y INT DEFAULT 0
        COMMENT 'Para diseño de croquis',

      PRIMARY KEY (id),

      CONSTRAINT fk_mesas_zona
        FOREIGN KEY (zona_id)
        REFERENCES zonas_restaurante (id),

      CONSTRAINT fk_mesas_mesero
        FOREIGN KEY (mesero_asignado_id)
        REFERENCES usuarios (id)
        ON DELETE SET NULL
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE mesas_salon;');
}
