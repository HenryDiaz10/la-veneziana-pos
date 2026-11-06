import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { cargarProveedoresReferencia } from '../src/services/proveedores-referencia.service.js';
try {
  if (env.entorno === 'production' || !['localhost', '127.0.0.1', '::1'].includes(env.database.host)) throw new Error('Carga limitada al desarrollo local.');
  if (process.argv.slice(2).some(a => a !== '--aplicar')) throw new Error('Uso: node scripts/cargar-proveedores-referencia.mjs [--aplicar]');
  console.log(JSON.stringify(await cargarProveedoresReferencia({ aplicar: process.argv.includes('--aplicar') })));
} catch (e) { console.error('No se completó la carga:', e.name.startsWith('Sequelize') ? 'Error de base de datos. Revisar esquema y conexión.' : e.message); process.exitCode = 1; }
finally { await sequelize.close(); }
