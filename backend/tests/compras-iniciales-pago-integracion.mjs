import assert from 'node:assert/strict';
import {sequelize} from '../src/config/database.js';
import {env} from '../src/config/env.js';
import {CompraFactura,InsumoAlmacen,AuditLog} from '../src/models/index.js';
import {saldarComprasIniciales} from '../src/services/compras-iniciales-pago.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
let tx;
const filtros={desde:'2026-11-06',hasta:'2026-11-06'};
try{
  assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  tx=await sequelize.transaction();
  const stock=async()=>JSON.stringify(await InsumoAlmacen.findAll({order:[['id','ASC']],transaction:tx,raw:true}));
  const antes=await stock(),reporteAntes=await consultarGerencial(filtros,tx);
  const cambio=await saldarComprasIniciales({transaction:tx});assert.equal(cambio.compras,6);
  const auditados=await AuditLog.count({transaction:tx});
  assert.equal((await saldarComprasIniciales({transaction:tx})).actualizadas,0);
  assert.equal(await AuditLog.count({transaction:tx}),auditados);
  assert.equal(await stock(),antes);
  const despues=await consultarGerencial(filtros,tx);
  assert.ok(Number(despues.compras.saldadas)>=9954.90);
  assert.deepEqual(despues.gastos,reporteAntes.gastos);
  assert.deepEqual(despues.movimientos,reporteAntes.movimientos);
  assert.deepEqual(despues.costos,reporteAntes.costos);
  const otro=await consultarGerencial({...filtros,estado:'anulada',sesion_id:'2147483647'},tx);
  assert.deepEqual(otro.compras,despues.compras,'Compras son globales, no se asignan a ventas/caja');
  const fuera=await consultarGerencial({desde:'2000-01-01',hasta:'2000-01-01'},tx);
  assert.equal(fuera.compras.total,'0.00');
  const c=await CompraFactura.findOne({where:{numero_factura:'CI-20261106-001'},transaction:tx});
  await c.update({estado_pago:'pagado_parcial'},{transaction:tx});
  assert.equal((await consultarGerencial(filtros,tx)).compras.saldo_pendiente,null,'No inventar importe de abonos parciales');
  console.log('OK: seis compras saldadas, repetición sin duplicados, rango y alcance del reporte, parciales sin saldo inventado; sin cambiar stock/caja/gastos. Rollback.');
}catch(e){console.error(e.name,e.codigo??e.message);process.exitCode=1;}
finally{if(tx&&!tx.finished)await tx.rollback();await sequelize.close();}
