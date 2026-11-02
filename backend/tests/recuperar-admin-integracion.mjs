import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { sequelize } from '../src/config/database.js';
import { Usuario, Rol, AuthSesion, AuditLog } from '../src/models/index.js';
import { crearHashPassword, verificarPassword } from '../src/security/password.js';
import { recuperarAdministrador } from '../scripts/recuperar-admin.js';
// Todo se revierte: nunca modifica la cuenta real del propietario.
const tx = await sequelize.transaction();
try {
  const marca = randomUUID(), anterior = randomBytes(20).toString('hex'), nueva = randomBytes(20).toString('hex');
  const rol = await Rol.findOne({ where: { nombre: 'administrador' }, transaction: tx });
  const otroRol = await Rol.findOne({ where: { nombre: 'cajero' }, transaction: tx });
  const hash = await crearHashPassword(anterior);
  const u = await Usuario.create({ nombre_completo: 'Recuperación prueba', email: `${marca}@example.invalid`, password_hash: hash,
    rol_id: rol.id, estado: 'activo', intentos_fallidos: 5, bloqueado_hasta: new Date(Date.now() + 600000) }, { transaction: tx });
  const sesion = await AuthSesion.create({ usuario_id: u.id, session_uid: randomUUID(), expira_en: new Date(Date.now() + 600000) }, { transaction: tx });
  await assert.rejects(recuperarAdministrador(u.email, 'corta', tx));
  assert.equal(await recuperarAdministrador(u.email, nueva, tx), u.id);
  await u.reload({ transaction: tx }); await sesion.reload({ transaction: tx });
  assert.equal(await verificarPassword(nueva, u.password_hash), true);
  assert.equal(await verificarPassword(anterior, u.password_hash), false);
  assert.equal(u.intentos_fallidos, 0); assert.equal(u.bloqueado_hasta, null);
  assert.equal(u.rol_id, rol.id); assert.equal(u.estado, 'activo'); assert.ok(sesion.revocada_en);
  const audit = await AuditLog.findOne({ where: { entidad_afectada: 'usuarios', entidad_id: u.id, tipo_evento: 'SECURITY_ALERT' }, transaction: tx });
  assert.ok(audit); assert.ok(!JSON.stringify(audit).includes(nueva)); assert.equal(audit.usuario_id, null);
  await u.update({ rol_id: otroRol.id }, { transaction: tx });
  await assert.rejects(recuperarAdministrador(u.email, anterior, tx));
  await u.update({ rol_id: rol.id, estado: 'suspendido' }, { transaction: tx });
  await assert.rejects(recuperarAdministrador(u.email, anterior, tx));
  console.log('OK recuperación local: hash nuevo, bloqueo retirado, sesiones revocadas, auditoría sin secretos, rechazo de cuenta no administradora/inactiva. Registros de prueba revertidos.');
} finally { await tx.rollback(); await sequelize.close(); }
