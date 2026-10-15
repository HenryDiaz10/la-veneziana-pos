// Crear las categorías del catálogo comercial.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE categorias_venta (
      id INT NOT NULL AUTO_INCREMENT,

      nombre VARCHAR(100) NOT NULL,

      slug VARCHAR(100) UNIQUE NOT NULL,

      color_hex VARCHAR(10) DEFAULT '#000000',

      orden_visual INT DEFAULT 0,

      icono_url VARCHAR(255) DEFAULT NULL,

      es_para_kds BOOLEAN DEFAULT TRUE
        COMMENT 'Si es falso, no manda ticket a cocina (ej. Cigarros)',

      activa BOOLEAN DEFAULT TRUE,

      PRIMARY KEY (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE categorias_venta;');
}