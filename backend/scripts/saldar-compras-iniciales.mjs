import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { saldarComprasIniciales } from '../src/services/compras-iniciales-pago.js';
try {
  if (env.entorno === 'production' || !['localhost', '127.0.0.1', '::1'].includes(env.database.host)) throw Error('Solo desarrollo local.');
  console.log(JSON.stringify(await saldarComprasIniciales()));
} catch(e) { console.error(e.name.startsWith('Sequelize') ? 'No se completó el cambio en la base de datos.' : e.message); process.exitCode = 1; }
finally { await sequelize.close(); }
