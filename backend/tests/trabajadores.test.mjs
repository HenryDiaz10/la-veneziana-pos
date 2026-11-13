import test from 'node:test';import assert from 'node:assert/strict';
import {validarTrabajador} from '../src/services/trabajadores.service.js';
import {validarCredencialesLogin} from '../src/validators/login.js';
import {sequelize} from '../src/config/database.js';
test('trabajador con alias y correo opcional; campos y contraseña acotados',()=>{
  const base={nombre:' Cocinero de prueba ',usuario:'COCINERO01',email:null,documento:null,fecha_contratacion:null,rol_id:2,estado:'activo',password:'ClaveLarga-Prueba-123'};
  assert.equal(validarTrabajador(base,true).usuario,'cocinero01');
  assert.equal(validarTrabajador(base,true).email,null);
  for(const cambio of [{usuario:'a'},{usuario:'a@b.com'},{nombre:''},{fecha_contratacion:'2026-02-30'},{rol_id:'2'},{estado:'borrado'},{password:'corta'},{password:'á'.repeat(37)},{password_hash:'no'}])assert.throws(()=>validarTrabajador({...base,...cambio},true));
  const {password,...editar}=base;void password;assert.throws(()=>validarTrabajador(editar));
});
test('login por alias habilitado solo en autenticación, no altera alta antigua por correo',()=>{
  const c={email:'cocinero01',password:'ClaveLarga-Prueba-123'};
  assert.equal(validarCredencialesLogin(c),null);assert.ok(validarCredencialesLogin(c,{permitirUsuario:true}));
  assert.equal(validarCredencialesLogin({...c,email:'<script>'},{permitirUsuario:true}),null);
  assert.ok(validarCredencialesLogin({...c,email:'admin@example.invalid'}));
});
test.after(async()=>{await sequelize.close();});
