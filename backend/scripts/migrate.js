// Comandos disponibles para administrar las migraciones.
const comandos = ['pending', 'executed', 'up', 'down'];
const [comando, ...argumentosExtra] = process.argv.slice(2);

// Validar antes de cargar credenciales o abrir conexiones.
if (!comandos.includes(comando) || argumentosExtra.length > 0) {
  console.error(
    'Uso: node scripts/migrate.js pending|executed|up|down'
  );

  process.exitCode = 1;
} else {
  let sequelizeMigrations;

  try {
    // Cargar la conexión exclusiva de migraciones.
    ({ sequelizeMigrations } = await import(
      '../src/config/database.migrations.js'
    ));

    const { migrador } = await import(
      '../src/config/migrator.js'
    );

    // Comprobar la conexión antes de consultar el historial.
    await sequelizeMigrations.authenticate();

    let resultado;

    switch (comando) {
      case 'pending':
        resultado = await migrador.pending();
        break;

      case 'executed':
        resultado = await migrador.executed();
        break;

      case 'up':
        resultado = await migrador.up();
        break;

      case 'down':
        // Revertir únicamente la última migración aplicada.
        resultado = await migrador.down({ step: 1 });
        break;
    }

    if (resultado.length === 0) {
      console.log(`Sin migraciones para: ${comando}.`);
    } else {
      console.table(
        resultado.map(({ name }) => ({
          migracion: name
        }))
      );
    }

    console.log('Operacion completada.');
  } catch (error) {
    console.error('La operacion de migraciones fallo.');
    console.error(error.message);

    // Informar el fallo al sistema operativo.
    process.exitCode = 1;
  } finally {
    // Cerrar el pool tanto en caso de éxito como de error.
    if (sequelizeMigrations) {
      await sequelizeMigrations.close().catch(() => {
        console.error('No se pudo cerrar el pool de migraciones.');
        process.exitCode = 1;
      });
    }
  }
}