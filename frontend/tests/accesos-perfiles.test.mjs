import { test } from 'node:test'
import assert from 'node:assert/strict'
import { obtenerAccesos, puedeAccederRuta } from '../src/utils/accesos.js'
import { permisosEfectivos } from '../../backend/src/security/perfiles.js'
const todos = [['pedidos','crear'],['mesas','gestionar'],['kds','operar'],['ventas','cobrar'],['ventas','devolver'],['caja','gestionar'],['catalogo','gestionar'],['inventario','gestionar'],['clientes','buscar'],['clientes','gestionar'],['reportes','leer'],['seguridad','gestionar'],['configuracion','gestionar']].map(([modulo,accion])=>({modulo,accion}))
const esperados={
  administrador:['/inicio','/trabajadores','/reportes','/historial-ventas','/estado-resultados','/salon','/caja','/catalogo','/recetas','/clientes','/inventario','/compras'],
  mesero:['/inicio','/salon','/tomar-pedido','/clientes'],
  cajero:['/inicio','/pos','/pagos','/caja','/clientes'],
  cocinero:['/inicio','/cocina']
}
for(const [nombre,rutas] of Object.entries(esperados))test(`Perfil ${nombre}: rutas exactas y techo de permisos`,()=>{
  const usuario={rol:{nombre},permisos:todos}
  assert.deepEqual(obtenerAccesos(usuario).map(a=>a.ruta),rutas)
  for(const ruta of new Set(Object.values(esperados).flat()))assert.equal(puedeAccederRuta(usuario,ruta),rutas.includes(ruta))
  const efectivos=permisosEfectivos(nombre,todos)
  assert.deepEqual(obtenerAccesos({...usuario,permisos:efectivos}).map(a=>a.ruta),rutas)
  assert.deepEqual(permisosEfectivos(nombre,[]),[])
  assert.deepEqual(obtenerAccesos({...usuario,permisos:[]}).map(a=>a.ruta),['/inicio'])
  assert.equal(puedeAccederRuta(usuario,'/seguridad'),false)
  assert.equal(puedeAccederRuta(usuario,'/componentes'),false)
})
test('Mesero y cocinero no reciben privilegios de caja; administrador no opera ventas',()=>{
  for(const rol of ['mesero','cocinero','administrador'])assert.ok(!permisosEfectivos(rol,todos).some(p=>p.modulo==='ventas'&&p.accion==='cobrar'))
  assert.ok(!permisosEfectivos('mesero',todos).some(p=>p.modulo==='caja'))
  assert.ok(!permisosEfectivos('administrador',todos).some(p=>p.modulo==='kds'||p.modulo==='pedidos'))
  assert.deepEqual(permisosEfectivos('perfil_personalizado',[todos[0]]),[todos[0]])
  assert.deepEqual(obtenerAccesos(null),[])
})
