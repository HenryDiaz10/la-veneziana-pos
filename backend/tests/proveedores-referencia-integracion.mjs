import assert from 'node:assert/strict';
import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { ProveedorMaestro, CompraFactura, InsumoAlmacen } from '../src/models/index.js';
import { cargarProveedoresReferencia } from '../src/services/proveedores-referencia.service.js';
let tx;
try {
  assert.notEqual(env.entorno,'production');
  assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  tx=await sequelize.transaction();
  const stock=async()=>JSON.stringify(await InsumoAlmacen.findAll({order:[['id','ASC']],transaction:tx,raw:true}));
  const antes=await stock(), compras=await CompraFactura.count({transaction:tx});
  await cargarProveedoresReferencia({aplicar:true,transaction:tx});
  const proveedor=await ProveedorMaestro.findOne({where:{ruc:'20100055237'},transaction:tx});
  await proveedor.update({telefono_contacto:'CONTACTO LOCAL EDITADO',dias_credito:7},{transaction:tx});
  const segunda=await cargarProveedoresReferencia({aplicar:true,transaction:tx});
  assert.equal(segunda.creados,0);
  assert.equal(segunda.existentes,7);
  await proveedor.reload({transaction:tx});
  assert.equal(proveedor.telefono_contacto,'CONTACTO LOCAL EDITADO');
  assert.equal(proveedor.dias_credito,7);
  assert.equal(await stock(),antes);
  assert.equal(await CompraFactura.count({transaction:tx}),compras);
  await proveedor.update({razon_social:'Empresa distinta'},{transaction:tx});
  await assert.rejects(cargarProveedoresReferencia({aplicar:true,transaction:tx}),/otra razón social/);
  console.log('OK: 7 proveedores, carga repetible, ediciones conservadas, conflicto rechazado, sin compras ni stock. Rollback.');
}catch(e){console.error(e.name,e.message);process.exitCode=1;}
finally{if(tx&&!tx.finished)await tx.rollback();await sequelize.close();}
