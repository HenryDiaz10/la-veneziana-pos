// Crear las direcciones vinculadas a cada cliente.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE direcciones_clientes (
      id INT NOT NULL AUTO_INCREMENT,

      cliente_id INT NOT NULL,

      alias VARCHAR(50) DEFAULT 'Casa'
        COMMENT 'Casa, Trabajo',

      direccion_completa VARCHAR(255) NOT NULL,

      referencia VARCHAR(255) DEFAULT NULL,

      coordenadas_gps VARCHAR(100) DEFAULT NULL
        COMMENT 'Lat,Lng para mapa de delivery',

      es_predeterminada BOOLEAN DEFAULT FALSE,

      PRIMARY KEY (id),

      CONSTRAINT fk_dircliente_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    'DROP TABLE direcciones_clientes;'
  );
}