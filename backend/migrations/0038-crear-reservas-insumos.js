// Crear reservas_insumos con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE reservas_insumos (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      tarea_id BIGINT NOT NULL,

      insumo_id INT NOT NULL,

      cantidad_base DECIMAL(12,4) NOT NULL,

      estado ENUM('reservada', 'consumida', 'liberada')
        NOT NULL DEFAULT 'reservada',

      costo_unitario_snapshot DECIMAL(12,4) NULL,

      costo_total_snapshot DECIMAL(14,4) NULL,

      kardex_id BIGINT NULL,

      clasificacion_consumo ENUM('venta', 'merma', 'cortesia')
        NOT NULL DEFAULT 'venta',

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      consumido_en TIMESTAMP NULL,

      UNIQUE KEY uq_reserva_tarea_insumo (tarea_id, insumo_id),

      UNIQUE KEY uq_reserva_kardex (kardex_id),

      FOREIGN KEY (tarea_id)
        REFERENCES kds_tareas (id),

      FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id),

      FOREIGN KEY (kardex_id)
        REFERENCES inventario_kardex (id),

      CHECK (cantidad_base > 0),

      CHECK (costo_unitario_snapshot IS NULL OR costo_unitario_snapshot >= 0),

      CHECK (costo_total_snapshot IS NULL OR costo_total_snapshot >= 0)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE reservas_insumos;');
}
