// Alias de acceso opcional para conservar las cuentas existentes por correo.
export async function up({context:q}) {
  await q.sequelize.query('ALTER TABLE usuarios ADD COLUMN usuario_acceso VARCHAR(40) NULL UNIQUE AFTER nombre_completo, MODIFY COLUMN email VARCHAR(100) NULL');
}
export async function down({context:q}) {
  const [filas]=await q.sequelize.query('SELECT COUNT(*) cantidad FROM usuarios WHERE email IS NULL');
  if(Number(filas[0].cantidad)>0)throw Error('Asigna correos a todas las cuentas antes de revertir; no se inventarán correos.');
  await q.sequelize.query('ALTER TABLE usuarios DROP COLUMN usuario_acceso, MODIFY COLUMN email VARCHAR(100) NOT NULL');
}
