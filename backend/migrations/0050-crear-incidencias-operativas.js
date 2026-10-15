// Crear incidencias_operativas con su estructura final.
// Los datos iniciales se cargarán por separado mediante seeds.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE incidencias_operativas (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,

      insumo_id INT NULL,

      tarea_id BIGINT NULL,

      tipo ENUM(
        'quiebre',
        'merma',
        'impresion',
        'conexion',
        'otro'
      ) NOT NULL,

      descripcion VARCHAR(1000) NOT NULL,

      usuario_id INT NOT NULL,

      estado ENUM('abierta', 'resuelta')
        NOT NULL DEFAULT 'abierta',

      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      resuelto_en TIMESTAMP NULL,

      FOREIGN KEY (insumo_id)
        REFERENCES insumos_almacen (id),

      FOREIGN KEY (tarea_id)
        REFERENCES kds_tareas (id),

      FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar la tabla al revertir esta migración.
// Primero deberán revertirse las tablas que dependan de ella.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE incidencias_operativas;');
}
