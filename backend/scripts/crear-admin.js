import { sequelize } from '../src/config/database.js';
import { Usuario, Rol } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { validarCredencialesLogin } from '../src/validators/login.js';
import { crearTerminalSegura } from './helpers/terminal.js';

// Mensajes controlados que podemos mostrar al operador.
class ErrorAlta extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorAlta';
  }
}

// Comprobar que existen los seeds y que todavía no hay administrador.
async function obtenerRolInicial(transaction) {
  const opciones = {
    where: { nombre: 'administrador' },
    attributes: ['id'],
    transaction
  };

  if (transaction) {
    // Serializar dos ejecuciones simultáneas de este comando.
    opciones.lock = transaction.LOCK.UPDATE;
  }

  const rol = await Rol.findOne(opciones);

  if (!rol) {
    throw new ErrorAlta(
      'Falta el rol administrador. Ejecuta primero los seeds.'
    );
  }

  const existente = await Usuario.findOne({
    where: { rol_id: rol.id },
    attributes: ['id'],
    transaction
  });

  if (existente) {
    throw new ErrorAlta(
      'Ya existe un administrador. Este comando solo realiza el alta inicial.'
    );
  }

  return rol;
}

let terminal;

try {
  // Las contraseñas se solicitan interactivamente.
  if (process.argv.length !== 2) {
    throw new ErrorAlta('Este comando no recibe argumentos.');
  }

  terminal = crearTerminalSegura();

  await sequelize.authenticate();
  await obtenerRolInicial();

  const nombre = (
    await terminal.preguntar('Nombre completo: ')
  ).trim();

  const email = await terminal.preguntar('Correo: ');

  const password = await terminal.preguntarOculto(
    'Contraseña: '
  );

  const confirmacion = await terminal.preguntarOculto(
    'Repite la contraseña: '
  );

  if (!nombre || nombre.length > 150) {
    throw new ErrorAlta(
      'El nombre debe tener entre 1 y 150 caracteres.'
    );
  }

  if (password !== confirmacion) {
    throw new ErrorAlta('Las contraseñas no coinciden.');
  }

  if (
    [...password].length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new ErrorAlta(
      'La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8.'
    );
  }

  const credenciales = validarCredencialesLogin({
    email,
    password
  });

  if (!credenciales) {
    throw new ErrorAlta('Revisa el formato del correo.');
  }

  // Calcular el hash antes de adquirir el bloqueo de base de datos.
  const passwordHash = await crearHashPassword(password);

  const usuarioId = await sequelize.transaction(async transaction => {
    // Repetir la comprobación dentro de la transacción.
    const rol = await obtenerRolInicial(transaction);

    const usuario = await Usuario.create(
      {
        nombre_completo: nombre,
        email: credenciales.email,
        password_hash: passwordHash,
        rol_id: rol.id,
        estado: 'activo'
      },
      { transaction }
    );

    return usuario.id;
  });

  console.log('Administrador inicial creado. ID:', usuarioId);
} catch (error) {
  if (error instanceof ErrorAlta) {
    console.error(error.message);
  } else if (error.name === 'AbortError') {
    console.error('Alta cancelada.');
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    console.error('El correo ya está registrado.');
  } else {
    // Evitar imprimir SQL, credenciales o hashes.
    console.error('No se pudo completar el alta del administrador.');
    console.error('Tipo de error:', error.name);
  }

  process.exitCode = 1;
} finally {
  terminal?.cerrar();

  await sequelize.close().catch(() => {
    console.error('No se pudo cerrar el pool.');
    process.exitCode = 1;
  });
}