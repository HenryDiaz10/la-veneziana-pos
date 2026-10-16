import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import {
  Usuario,
  Rol,
  AuthSesion,
  CategoriaVenta,
  ProductoVenta,
  VarianteProducto,
  ModificadorCatalogo,
  ModificadorItem,
  ProductoModificador
} from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';

assert.ok(
  env.entorno !== 'production' && ['127.0.0.1', 'localhost', '::1'].includes(env.database.host),
  'Solo se admite MySQL local de desarrollo.'
);

const marca = randomUUID();
const codigo = `f27-${marca.slice(0, 8)}`;
const usuarios = [];
let categoriaActiva, categoriaInactiva;
const productos = [];
let variante, grupoMod, itemMod, vinculoMod;
let servidor;

try {
  const password = randomBytes(24).toString('hex');
  const hash = await crearHashPassword(password);

  // Crear usuario cajero (tiene ventas/cobrar) y cocinero (tiene solo kds/operar)
  for (const nombreRol of ['cajero', 'cocinero']) {
    const rol = await Rol.findOne({ where: { nombre: nombreRol } });
    assert.ok(rol, `Rol ${nombreRol} debe existir`);
    const u = await Usuario.create({
      nombre_completo: `Usuario prueba POS ${nombreRol}`,
      email: `f27-${nombreRol}-${marca}@example.invalid`,
      password_hash: hash,
      rol_id: rol.id,
      estado: 'activo'
    });
    usuarios.push({ id: u.id, email: u.email, password, rol: nombreRol });
  }

  // Categorías
  categoriaActiva = await CategoriaVenta.create({
    nombre: `Cat Activa ${codigo}`,
    slug: `cat-activa-${codigo}`,
    activa: true,
    orden_visual: 1
  });

  categoriaInactiva = await CategoriaVenta.create({
    nombre: `Cat Inactiva ${codigo}`,
    slug: `cat-inactiva-${codigo}`,
    activa: false,
    orden_visual: 2
  });

  // Producto activo
  const prodActivo = await ProductoVenta.create({
    nombre: `Pizza Pepperoni ${codigo}`,
    categoria_id: categoriaActiva.id,
    sku: `SKU-${codigo}-1`,
    codigo_barras: `BAR-${codigo}-1`,
    descripcion: 'Deliciosa pizza con mozzarella y pepperoni artesanal',
    precio_venta_base: '28.50',
    tipo_producto: 'plato_preparado',
    estado: 'activo'
  });
  productos.push(prodActivo);

  // Producto inactivo (no debe aparecer en POS)
  const prodInactivo = await ProductoVenta.create({
    nombre: `Pizza Inactiva ${codigo}`,
    categoria_id: categoriaActiva.id,
    sku: `SKU-${codigo}-2`,
    codigo_barras: `BAR-${codigo}-2`,
    descripcion: 'No disponible',
    precio_venta_base: '20.00',
    tipo_producto: 'plato_preparado',
    estado: 'inactivo'
  });
  productos.push(prodInactivo);

  // Variante para prodActivo
  variante = await VarianteProducto.create({
    producto_id: prodActivo.id,
    nombre_variante: 'Familiar',
    precio_adicional: '6.50'
  });

  // Grupo de modificadores y opción
  grupoMod = await ModificadorCatalogo.create({
    nombre_grupo: `Bordes Queso ${codigo}`,
    es_multiple: false,
    es_obligatorio: true
  });

  itemMod = await ModificadorItem.create({
    grupo_id: grupoMod.id,
    nombre_modificador: 'Borde relleno de queso crema',
    precio_adicional: '4.00',
    es_exclusion: false
  });

  vinculoMod = await ProductoModificador.create({
    producto_id: prodActivo.id,
    grupo_id: grupoMod.id
  });

  // Iniciar servidor HTTP temporal
  servidor = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const origen = `http://127.0.0.1:${servidor.address().port}`;

  async function pedir(ruta, cookie, method = 'GET', datos) {
    const headers = { Origin: env.origenFrontend, 'X-CSRF-Protection': '1' };
    if (cookie) headers.Cookie = cookie;
    if (datos) headers['Content-Type'] = 'application/json';
    const r = await fetch(`${origen}/api${ruta}`, {
      method,
      headers,
      body: datos ? JSON.stringify(datos) : undefined
    });
    return { status: r.status, json: await r.json(), headers: r.headers };
  }

  // 1. Sin sesión: devuelve 401
  const rSinSesion = await pedir('/pos/catalogo');
  assert.equal(rSinSesion.status, 401, 'Sin sesión debe responder 401');

  // Iniciar sesión con cajero y cocinero
  const cookies = {};
  for (const u of usuarios) {
    const rLogin = await pedir('/auth/login', null, 'POST', {
      email: u.email,
      password: u.password
    });
    assert.equal(rLogin.status, 200, `Login de ${u.rol} debe ser exitoso`);
    cookies[u.rol] = rLogin.headers.get('set-cookie').split(';')[0];
  }

  // 2. Cocinero (sin ventas/cobrar): devuelve 403
  const rCocineroCatalogo = await pedir('/pos/catalogo', cookies.cocinero);
  assert.equal(rCocineroCatalogo.status, 403, 'Cocinero sin ventas/cobrar debe recibir 403');

  const rCocineroProducto = await pedir(`/pos/productos/${prodActivo.id}`, cookies.cocinero);
  assert.equal(rCocineroProducto.status, 403, 'Cocinero sin ventas/cobrar debe recibir 403 en producto');

  // 3. Cajero en ruta administrativa: debe recibir 403 (mantiene separación de permisos)
  const rCajeroAdmin = await pedir('/productos', cookies.cajero);
  assert.equal(rCajeroAdmin.status, 403, 'Cajero no debe acceder a /api/productos administrativo');

  // 4. Cajero en catálogo operativo POS: 200 OK
  const rCajeroCatalogo = await pedir('/pos/catalogo', cookies.cajero);
  assert.equal(rCajeroCatalogo.status, 200, 'Cajero debe acceder a /api/pos/catalogo');
  assert.ok(Array.isArray(rCajeroCatalogo.json.categorias), 'Debe devolver lista de categorías');
  assert.ok(Array.isArray(rCajeroCatalogo.json.productos), 'Debe devolver lista de productos');

  // Comprobar que categoría inactiva no aparece
  const idsCategorias = rCajeroCatalogo.json.categorias.map(c => c.id);
  assert.ok(idsCategorias.includes(categoriaActiva.id), 'Categoría activa debe estar');
  assert.ok(!idsCategorias.includes(categoriaInactiva.id), 'Categoría inactiva no debe estar');

  // Comprobar que producto inactivo no aparece en catálogo POS
  const idsProductos = rCajeroCatalogo.json.productos.map(p => p.id);
  assert.ok(idsProductos.includes(prodActivo.id), 'Producto activo debe estar en POS');
  assert.ok(!idsProductos.includes(prodInactivo.id), 'Producto inactivo no debe estar en POS');

  // 5. Filtro por categoría en catálogo POS
  const rFiltroCat = await pedir(`/pos/catalogo?categoriaId=${categoriaActiva.id}`, cookies.cajero);
  assert.equal(rFiltroCat.status, 200);
  assert.ok(rFiltroCat.json.productos.every(p => p.categoria_id === categoriaActiva.id));

  // 6. Filtro por búsqueda en catálogo POS
  const rFiltroBusqueda = await pedir(`/pos/catalogo?busqueda=Pepperoni`, cookies.cajero);
  assert.equal(rFiltroBusqueda.status, 200);
  assert.ok(rFiltroBusqueda.json.productos.some(p => p.id === prodActivo.id));

  // 7. Consulta operativa de producto: GET /pos/productos/:id
  const rProductoPos = await pedir(`/pos/productos/${prodActivo.id}`, cookies.cajero);
  assert.equal(rProductoPos.status, 200);
  assert.equal(rProductoPos.json.producto.id, prodActivo.id);
  assert.equal(rProductoPos.json.producto.nombre, prodActivo.nombre);
  assert.equal(rProductoPos.json.producto.precio_venta_base, prodActivo.precio_venta_base);

  // Variantes
  assert.ok(Array.isArray(rProductoPos.json.configuracion.variantes));
  const varEncontrada = rProductoPos.json.configuracion.variantes.find(v => v.id === variante.id);
  assert.ok(varEncontrada, 'Variante debe estar presente');
  assert.equal(varEncontrada.nombre_variante, 'Familiar');
  assert.equal(varEncontrada.precio_adicional, '6.50');

  // Grupos y modificadores
  assert.ok(Array.isArray(rProductoPos.json.configuracion.grupos));
  const grupoEncontrado = rProductoPos.json.configuracion.grupos.find(g => g.id === grupoMod.id);
  assert.ok(grupoEncontrado, 'Grupo de modificadores debe estar presente');
  assert.equal(grupoEncontrado.es_obligatorio, true);
  assert.equal(grupoEncontrado.es_multiple, false);
  assert.ok(Array.isArray(grupoEncontrado.opciones));
  const opcionEncontrada = grupoEncontrado.opciones.find(o => o.id === itemMod.id);
  assert.ok(opcionEncontrada, 'Opción modificadora debe estar presente');
  assert.equal(opcionEncontrada.precio_adicional, '4.00');

  // 8. Producto inactivo en GET /pos/productos/:id debe responder 404
  const rProdInactivoPos = await pedir(`/pos/productos/${prodInactivo.id}`, cookies.cajero);
  assert.equal(rProdInactivoPos.status, 404, 'Producto inactivo debe responder 404 en POS');

  // 9. ID inválido debe responder 400
  const rInvalido = await pedir('/pos/productos/abc', cookies.cajero);
  assert.equal(rInvalido.status, 400, 'ID no numérico debe responder 400');

  console.log('✔ Pruebas de integración de POS aprobadas con éxito:');
  console.log('  - 401 sin sesión');
  console.log('  - 403 usuario sin ventas/cobrar (cocinero)');
  console.log('  - 403 cajero protegido en catálogo administrativo');
  console.log('  - 200 cajero autorizado en catálogo operativo y producto POS');
  console.log('  - Filtros por categoría y búsqueda');
  console.log('  - Exclusión de productos y categorías inactivas');
  console.log('  - Variantes y modificadores con precios en configuración de producto');
  console.log('  - 404 para productos inactivos');
} finally {
  if (servidor) {
    await new Promise(resolve => servidor.close(resolve));
  }
  // Limpieza de fixtures
  try {
    if (vinculoMod) await vinculoMod.destroy();
    if (itemMod) await itemMod.destroy();
    if (grupoMod) await grupoMod.destroy();
    if (variante) await variante.destroy();
    for (const p of productos) await p.destroy();
    if (categoriaActiva) await categoriaActiva.destroy();
    if (categoriaInactiva) await categoriaInactiva.destroy();
    for (const u of usuarios) {
      await AuthSesion.destroy({ where: { usuario_id: u.id } });
      await Usuario.destroy({ where: { id: u.id } });
    }
  } catch (err) {
    console.error('Error al limpiar fixtures:', err.message);
  }
  await sequelize.close();
}
