// Crear la relación entre roles y permisos.
export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE TABLE rol_permisos (
      rol_id INT NOT NULL,
      permiso_id INT NOT NULL,

      PRIMARY KEY (rol_id, permiso_id),

      CONSTRAINT fk_rolperm_rol
        FOREIGN KEY (rol_id)
        REFERENCES roles (id)
        ON DELETE CASCADE,

      CONSTRAINT fk_rolperm_permiso
        FOREIGN KEY (permiso_id)
        REFERENCES permisos (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}

// Eliminar las asignaciones al revertir esta migración.
export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP TABLE rol_permisos;');
}