// Crear las opciones disponibles dentro de cada grupo.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE modificadores_items (
      id INT NOT NULL AUTO_INCREMENT,

      grupo_id INT NOT NULL,

      nombre_modificador VARCHAR(100) NOT NULL
        COMMENT 'Ej: Borde de Queso, Sin Cebolla',

      precio_adicional DECIMAL(12,2) DEFAULT 0.00,

      es_exclusion BOOLEAN DEFAULT FALSE
        COMMENT 'Vital para UI Cocina: Si es true, el KDS lo mostrará en una franja ROJA GIGANTE.',

      PRIMARY KEY (id),

      CONSTRAINT fk_moditem_grupo
        FOREIGN KEY (grupo_id)
        REFERENCES modificadores_catalogo (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar las opciones al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ellas.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    'DROP TABLE modificadores_items;'
  );
}