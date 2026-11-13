import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarConfiguracionCaja} from '../src/services/cajas-configuracion.service.js';
const base={nombre_terminal:'Caja principal',ip_maquina:null,estado:'activa',cajero_asignado_id:2};
test('Configuración estricta: identifica responsable, versión y direcciones IP',()=>{
  assert.equal(validarConfiguracionCaja(base,true).cajero_asignado_id,2);
  assert.equal(validarConfiguracionCaja({...base,ip_maquina:'::1',version_config:0}).ip_maquina,'::1');
  assert.equal(validarConfiguracionCaja({...base,cajero_asignado_id:null},true).cajero_asignado_id,null);
  for(const parche of [{ip_maquina:'https://equipo.local'},{estado:'cerrada'},{cajero_asignado_id:0},{cajero_asignado_id:'2'},{nombre_terminal:'x'},{intruso:true}])assert.throws(()=>validarConfiguracionCaja({...base,...parche},true));
  assert.throws(()=>validarConfiguracionCaja(base));
  assert.throws(()=>validarConfiguracionCaja({...base,version_config:-1}));
});
