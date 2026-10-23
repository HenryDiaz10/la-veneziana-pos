// HTTP/MySQL local, fixtures propias y limpieza. No modificar mesas reales.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Rol, Usuario, ZonaRestaurante, MesaSalon, AuthSesion, AuditLog } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const marca = randomUUID(), usuarios = [], zonas = [], mesas = [];
let servidor;
try {
  const password = randomBytes(24).toString('hex'), hash = await crearHashPassword(password);
  for (const nombre of ['mesero', 'cocinero']) {
    const rol = await Rol.findOne({ where: { nombre } }); assert.ok(rol);
    usuarios.push(await Usuario.create({ nombre_completo: 'Prueba salón F33', email: `f33-${nombre}-${marca}@example.invalid`, password_hash: hash, rol_id: rol.id, estado: 'activo' }));
  }
  zonas.push(await ZonaRestaurante.create({ nombre: `Prueba F33 ${marca.slice(0, 8)}`, aforo_maximo: 20 }));
  zonas.push(await ZonaRestaurante.create({ nombre: `Vacía F33 ${marca.slice(0, 8)}`, aforo_maximo: null }));
  for (const [i, estado] of ['libre', 'ocupada', 'sucia_por_limpiar', 'inhabilitada', null].entries()) {
    mesas.push(await MesaSalon.create({ zona_id: zonas[0].id, codigo_mesa: `${marca.slice(0, 7)}${i}`, capacidad_sillas: i === 4 ? null : 4,
      estado_actual: estado, mesero_asignado_id: i === 1 ? usuarios[0].id : null, posicion_x: i === 4 ? null : i * 100, posicion_y: i === 4 ? null : 25 }));
  }
  const originales = mesas.map(m => m.get({ plain: true }));
  servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const cookies = [];
  for (const u of usuarios) {
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.origenFrontend, 'X-CSRF-Protection': '1' }, body: JSON.stringify({ email: u.email, password }) });
    assert.equal(r.status, 200); cookies.push(r.headers.get('set-cookie').split(';')[0]);
  }
  assert.equal((await fetch(base + '/salon')).status, 401);
  assert.equal((await fetch(base + '/salon', { headers: { Cookie: cookies[1] } })).status, 403);
  const headers = { Cookie: cookies[0] };
  assert.equal((await fetch(base + '/salon?zona=1', { headers })).status, 400);
  const r = await fetch(base + '/salon', { headers }), d = await r.json();
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.ok(Number.isFinite(Date.parse(d.consultado_en)));
  assert.ok(d.zonas.some(z => z.id === zonas[1].id));
  const recibidas = d.mesas.filter(m => m.zona_id === zonas[0].id);
  assert.equal(recibidas.length, 5);
  for (const original of originales) {
    const recibida = recibidas.find(m => m.id === original.id);
    assert.match(recibida.revision, /^[a-f0-9]{64}$/); assert.equal(recibida.pedido_abierto, null);
    const { revision, pedido_abierto, ...campos } = recibida;
    assert.deepEqual(campos, original);
    assert.deepEqual((await MesaSalon.findByPk(original.id)).get({ plain: true }), original);
  }
  assert.ok(!JSON.stringify(d).includes(usuarios[0].email) && !JSON.stringify(d).includes(hash));
  assert.equal((await fetch(base + '/salon', { method: 'POST', headers: { ...headers, Origin: env.origenFrontend, 'X-CSRF-Protection': '1' } })).status, 404);
  console.log('OK fase 33: consulta HTTP/MySQL, mesero permitido, sin sesión/permiso rechazado, estados exactos/null, zona vacía, coordenadas/asignación, privacidad y cero cambios en mesas.');
} finally {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  for (const mesa of mesas) await mesa.destroy();
  for (const zona of zonas) await zona.destroy();
  const ids = usuarios.map(u => u.id);
  if (ids.length) { await AuthSesion.destroy({ where: { usuario_id: ids } }); await AuditLog.destroy({ where: { usuario_id: ids } }); await Usuario.destroy({ where: { id: ids } }); }
  await sequelize.close();
}
