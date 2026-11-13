// La asignación configura turnos futuros; no cambia responsables históricos.
export async function up({context:q}) {
  await q.sequelize.query(`ALTER TABLE cajas_fisicas
    ADD COLUMN cajero_asignado_id INT NULL,
    ADD COLUMN version_config INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT fk_caja_cajero_asignado FOREIGN KEY (cajero_asignado_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE NO ACTION`);
}
export async function down({context:q}) {
  await q.sequelize.query('ALTER TABLE cajas_fisicas DROP FOREIGN KEY fk_caja_cajero_asignado, DROP COLUMN cajero_asignado_id, DROP COLUMN version_config');
}
