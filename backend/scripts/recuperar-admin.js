import { pathToFileURL } from 'node:url';
import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { Usuario, Rol, AuthSesion, AuditLog } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { validarCredencialesLogin } from '../src/validators/login.js';
import { crearTerminalSegura } from './helpers/terminal.js';

class ErrorRecuperacion extends Error {}

// Herramienta del propietario con acceso al equipo y la BD de desarrollo.
// No se monta en HTTP ni crea cuentas, activa empleados o cambia sus roles.
export async function recuperarAdministrador(email, password, transaction) {
  if (env.entorno === 'production' || !['localhost', '127.0.0.1', '::1'].includes(env.database.host)) {
    throw new ErrorRecuperacion('Esta recuperación solo admite la base local de desarrollo.');
  }
  const credenciales = validarCredencialesLogin({ email, password });
  if (!credenciales || [...password].length < 12) throw new ErrorRecuperacion('Revisa el correo y usa una contraseña de 12 caracteres o más (máximo 72 bytes UTF-8).');
  const hash = await crearHashPassword(password);
  return sequelize.transaction(transaction ? { transaction } : {}, async tx => {
    // Misma barrera que la administración de roles, después bloquear al usuario.
    const rol = await Rol.findOne({ where: { nombre: 'administrador' }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!rol) throw new ErrorRecuperacion('No existe el rol administrador.');
    const usuario = await Usuario.findOne({ where: { email: credenciales.email }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!usuario || usuario.rol_id !== rol.id || usuario.estado !== 'activo') throw new ErrorRecuperacion('El correo no corresponde a un administrador activo.');
    await usuario.update({ password_hash: hash, intentos_fallidos: 0, bloqueado_hasta: null }, { transaction: tx, fields: ['password_hash', 'intentos_fallidos', 'bloqueado_hasta'] });
    await AuthSesion.update({ revocada_en: new Date() }, { where: { usuario_id: usuario.id, revocada_en: null }, transaction: tx });
    // Auditoría sin contraseña, hash ni suplantar a un aprobador autenticado.
    await AuditLog.create({ usuario_id: null, entidad_afectada: 'usuarios', entidad_id: usuario.id, tipo_evento: 'SECURITY_ALERT',
      descripcion: 'Recuperación local de administrador desde terminal; contraseña restablecida y sesiones revocadas.' }, { transaction: tx });
    return usuario.id;
  });
}

async function main() {
  let terminal;
  try {
    if (process.argv.length !== 2) throw new ErrorRecuperacion('Este comando no recibe argumentos ni contraseñas por línea de comandos.');
    terminal = crearTerminalSegura();
    const email = await terminal.preguntar('Correo del administrador: ');
    const password = await terminal.preguntarOculto('Nueva contraseña (mínimo 12 caracteres): ');
    const confirmar = await terminal.preguntarOculto('Repite la nueva contraseña: ');
    if (password !== confirmar) throw new ErrorRecuperacion('Las contraseñas no coinciden.');
    const id = await recuperarAdministrador(email, password);
    console.log('Contraseña actualizada. Administrador ID:', id, '\nYa puedes iniciar sesión con la nueva contraseña.');
  } catch (e) {
    console.error(e instanceof ErrorRecuperacion ? e.message : e.name === 'AbortError' ? 'Recuperación cancelada.' : 'No se pudo completar la recuperación. Comprueba la conexión y ejecuta en una terminal interactiva.');
    process.exitCode = 1;
  } finally { terminal?.cerrar(); await sequelize.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
