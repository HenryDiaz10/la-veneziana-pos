import assert from 'node:assert/strict';
import {sequelize} from '../src/config/database.js';
import {env} from '../src/config/env.js';
import {InsumoAlmacen,CompraFactura,InventarioKardex,ProductoVenta} from '../src/models/index.js';
import {cargarComprasIniciales} from '../src/services/compras-iniciales.service.js';
import {verificarMargenesIniciales} from '../src/services/compras-iniciales-margen.js';
import {lineasComprasIniciales} from '../data/compras-iniciales.mjs';
let tx;
try{
  assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  tx=await sequelize.transaction();
  const capturar=async()=>JSON.stringify(await InsumoAlmacen.findAll({order:[['id','ASC']],transaction:tx,raw:true}));
  const precios=JSON.stringify(await ProductoVenta.findAll({attributes:['id','precio_venta_base'],order:[['id','ASC']],transaction:tx,raw:true}));
  const previos=await InsumoAlmacen.findAll({transaction:tx});
  const resultado=await cargarComprasIniciales({aplicar:true,transaction:tx});
  assert.equal(resultado.insumos,125);assert.equal(resultado.documentos.length,6);
  const despues=await capturar(),kardex=await InventarioKardex.count({transaction:tx}),compras=await CompraFactura.count({transaction:tx});
  for(const l of lineasComprasIniciales){
    const i=await InsumoAlmacen.findOne({where:{codigo:l.codigo},transaction:tx});
    const previo=previos.find(p=>p.id===i.id);
    const entrada=resultado.creadas?Number(l.cantidad_base):0;
    assert.ok(Math.abs(Number(i.stock_fisico)-Number(previo.stock_fisico)-entrada)<0.00001);
    assert.equal(i.stock_reservado,previo.stock_reservado);
    assert.ok(Number(i.costo_promedio)>0);
  }
  const repetida=await cargarComprasIniciales({aplicar:true,transaction:tx});
  assert.equal(repetida.creadas,0);assert.equal(await capturar(),despues);
  assert.equal(await InventarioKardex.count({transaction:tx}),kardex);
  assert.equal(await CompraFactura.count({transaction:tx}),compras);
  assert.equal(JSON.stringify(await ProductoVenta.findAll({attributes:['id','precio_venta_base'],order:[['id','ASC']],transaction:tx,raw:true})),precios);
  assert.equal((await verificarMargenesIniciales({transaction:tx})).length,206);
  await tx.rollback();tx=null;
  // La reversión externa debe incluir documentos, Kardex, costos y saldos.
  for(const p of previos){const i=await InsumoAlmacen.findByPk(p.id);assert.equal(i.stock_fisico,p.stock_fisico);assert.equal(i.costo_promedio,p.costo_promedio);}
  console.log('OK: 6 compras/125 ingresos, IGV, saldos, costos, 206 márgenes, repetición sin duplicados y rollback externo.');
}catch(e){console.error(e.name,e.codigo??e.message);process.exitCode=1;}
finally{if(tx&&!tx.finished)await tx.rollback();await sequelize.close();}
