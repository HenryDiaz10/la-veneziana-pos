// Crear el catálogo de insumos y sus saldos de almacén.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE insumos_almacen (
      id INT NOT NULL AUTO_INCREMENT,

      codigo VARCHAR(50) UNIQUE DEFAULT NULL,

      nombre VARCHAR(150) NOT NULL,

      unidad_medida_id INT NOT NULL,

      costo_promedio DECIMAL(12,4) NOT NULL DEFAULT 0,

      ultimo_costo DECIMAL(12,4) NOT NULL DEFAULT 0,

      stock_fisico DECIMAL(12,4) NOT NULL DEFAULT 0,

      stock_minimo_alerta DECIMAL(12,4) NOT NULL DEFAULT 0,

      perecible BOOLEAN DEFAULT TRUE,

      activo BOOLEAN DEFAULT TRUE,

      stock_reservado DECIMAL(12,4) NOT NULL DEFAULT 0,

      quiebre_declarado BOOLEAN NOT NULL DEFAULT FALSE,

      PRIMARY KEY (id),

      CONSTRAINT fk_insumos_unidad
        FOREIGN KEY (unidad_medida_id)
        REFERENCES unidades_medida (id),

      CONSTRAINT ck_stock_reserva
        CHECK (
          stock_fisico >= 0
          AND stock_reservado >= 0
          AND stock_reservado <= stock_fisico
        ),

      CONSTRAINT ck_costo_insumo
        CHECK (
          costo_promedio >= 0
          AND ultimo_costo >= 0
        ),

      CONSTRAINT ck_minimo_insumo
        CHECK (stock_minimo_alerta >= 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de los insumos.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE insumos_almacen;');
}