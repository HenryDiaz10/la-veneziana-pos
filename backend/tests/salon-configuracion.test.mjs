import test from 'node:test';
import assert from 'node:assert/strict';
import {validarZona,validarMesaConfiguracion,presentarZona} from '../src/services/salon-configuracion.js';
import {sequelize} from '../src/config/database.js';
test('zonas acotadas y revisión de edición obligatoria',()=>{
  assert.deepEqual(validarZona({nombre:'  Terraza  ',aforo_maximo:20}),{nombre:'Terraza',aforo_maximo:20});
  for(const c of [{nombre:'A',aforo_maximo:1},{nombre:'Zona',aforo_maximo:-1},{nombre:'Zona',aforo_maximo:'20'},{nombre:'Zona',aforo_maximo:0,estado:'activa'}])assert.throws(()=>validarZona(c));
  assert.throws(()=>validarZona({nombre:'Terraza',aforo_maximo:20},true));
  assert.notEqual(presentarZona({id:1,nombre:'Zona',aforo_maximo:20},1).revision,presentarZona({id:1,nombre:'Zona',aforo_maximo:20},2).revision);
});
test('mesa admite código normalizado, sillas y posición opcional; no estados operativos arbitrarios',()=>{
  const base={zona_id:1,codigo_mesa:' m01 ',capacidad_sillas:4,posicion_x:null,posicion_y:null,habilitada:true};
  assert.equal(validarMesaConfiguracion(base).codigo_mesa,'M01');
  for(const c of [{capacidad_sillas:0},{capacidad_sillas:51},{posicion_x:3},{posicion_y:-1},{zona_id:'1'},{codigo_mesa:'<script>'},{habilitada:'true'},{mesero_asignado_id:2},{estado_actual:'ocupada'}])assert.throws(()=>validarMesaConfiguracion({...base,...c}));
});
test.after(async()=>{await sequelize.close();});
