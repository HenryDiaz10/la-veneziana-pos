// Comprobación del catálogo real en MySQL y navegador, con empleado temporal.
// Nunca usa credenciales del usuario ni altera los productos importados.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { Usuario, Rol, AuthSesion } from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
assert.ok(env.entorno !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(env.database.host));
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
let usuario;
let browser;
try {
  const rol = await Rol.findOne({ where: { nombre: 'cajero' } });
  assert.ok(rol);
  const password = randomBytes(24).toString('hex');
  const email = `carta-${randomUUID()}@example.invalid`;
  usuario = await Usuario.create({ nombre_completo: 'Prueba temporal de carta', email,
    password_hash: await crearHashPassword(password), rol_id: rol.id, estado: 'activo' });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', error => errores.push(error.message));
  const peticionSesion = page.waitForRequest(r => r.url().includes('/auth/session'));
  await page.goto('http://localhost:5173/pos');
  const api = (await peticionSesion).url().replace('/auth/session', '');
  const login = await context.request.post(`${api}/auth/login`, { data: { email, password },
    headers: { Origin: 'http://localhost:5173', 'X-CSRF-Protection': '1' } });
  assert.equal(login.status(), 200);
  await page.goto('http://localhost:5173/pos');
  await page.waitForFunction(() => document.querySelectorAll('.pos-product-card').length === 87);
  // La primera miniatura visible debe descargarse, no solo mostrar el fallback.
  await page.waitForFunction(() => [...document.querySelectorAll('.pos-product-thumb img')].some(i => i.complete && i.naturalWidth > 0));
  const buscar = page.getByRole('searchbox', { name: /Buscar producto/ });
  // Nueve sabores con URLs distintas, sin reutilizar la foto de una mezcla.
  await buscar.fill('frozen');
  await page.waitForFunction(() => document.querySelectorAll('.pos-product-card').length === 9);
  const fotos = await page.locator('.pos-product-card img').evaluateAll(ims => ims.map(i => i.src));
  assert.equal(new Set(fotos).size, 9);
  for (const img of await page.locator('.pos-product-card img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(i => i.decode());
    assert.ok(await img.evaluate(i => i.naturalWidth > 0));
  }
  if (process.argv[3]) {
    await mkdir(process.argv[3], { recursive: true });
    await page.locator('.pos-product-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.argv[3]}/frozen-distintos.png`, fullPage: true });
  }
  // El mismo criterio se aplica a toda la categoría de tragos y cervezas.
  await buscar.fill('');
  await page.getByRole('tab', { name: 'Tragos y cervezas', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pos-product-card').length === 14);
  assert.equal(new Set(await page.locator('.pos-product-card img').evaluateAll(ims => ims.map(i => i.src))).size, 14);
  for (const img of await page.locator('.pos-product-card img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(i => i.decode());
    assert.ok(await img.evaluate(i => i.naturalWidth > 0));
  }
  await page.getByRole('heading', { name:'Pantera rosa', exact:true }).waitFor();
  if (process.argv[3]) {
    await page.locator('.pos-product-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.argv[3]}/tragos-distintos.png`, fullPage: true });
  }
  await page.getByRole('tab', { name: /Todas/ }).click();
  let fotoInca;
  for (const [texto, cantidad] of [['Inca Kola', 1], ['Coca-Cola', 1], ['Agua San Luis 625 ml', 1]]) {
    await buscar.fill(texto);
    await page.waitForFunction(n => document.querySelectorAll('.pos-product-card').length === n, cantidad);
    const tarjeta = page.locator('.pos-product-card').first();
    const foto = tarjeta.locator('img');
    await foto.scrollIntoViewIfNeeded();
    await foto.evaluate(i => i.decode());
    if (texto === 'Inca Kola') fotoInca = await foto.getAttribute('src');
    if (texto === 'Coca-Cola') {
      assert.notEqual(await foto.getAttribute('src'), fotoInca);
      assert.ok(!(await page.locator('.pos-product-card').allTextContents()).some(t => /gordita/i.test(t)));
    }
    if (texto.startsWith('Agua')) await tarjeta.getByText('S/ 3.00', { exact:true }).waitFor();
  }
  console.log('Comprobando selector de bebidas, cantidades e IDs reales…');
  // Una tarjeta por marca, precios completos y los IDs reales de cada envase.
  const catalogoReal = await (await context.request.get(`${api}/pos/catalogo`)).json();
  const botella = sku => catalogoReal.productos.find(p => p.sku === sku);
  const borrador = () => page.evaluate(uid => JSON.parse(localStorage.getItem(`la-veneziana-carrito-v1:${uid}`)), usuario.id);
  await buscar.fill('Coca-Cola');
  await page.getByRole('button', { name:'Añadir Coca-Cola al pedido', exact:true }).click();
  let bebida = page.getByRole('dialog');
  await bebida.getByRole('radio', {name:/^1 litro /}).check();
  assert.equal(await bebida.getByRole('radio').count(),5);
  assert.equal(await bebida.getByRole('radio',{name:/Gordita/}).count(),0);
  await bebida.getByLabel('Cantidad a preparar').fill('2');
  await bebida.getByText('S/ 16.00',{exact:true}).waitFor();
  await bebida.getByRole('button',{name:'Añadir al pedido',exact:true}).click();
  await page.locator('.pos-receipt').getByRole('heading',{name:/Coca-Cola 1 litro$/}).waitFor();
  assert.equal((await borrador()).lineas[0].productoId,botella('CARTA-FRI-COCA-1L').id);
  await page.getByRole('button',{name:'Editar línea 1',exact:true}).click();
  bebida = page.getByRole('dialog');
  assert.ok(await bebida.getByRole('radio',{name:/^1 litro /}).isChecked());
  await bebida.getByRole('radio',{name:/^500 ml /}).check();
  await bebida.getByText('S/ 9.00',{exact:true}).waitFor();
  assert.equal(await bebida.getByLabel('Cantidad a preparar').inputValue(),'2');
  await bebida.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.locator('.pos-receipt').getByRole('heading',{name:/Coca-Cola 500 ml$/}).waitFor();
  await page.reload();
  await page.locator('.pos-receipt').getByRole('heading',{name:/Coca-Cola 500 ml$/}).waitFor();
  assert.equal((await borrador()).lineas[0].productoId,botella('CARTA-FRI-COCA-MEDIO').id);
  assert.equal((await borrador()).lineas[0].cantidad,2);
  await page.getByRole('button',{name:'Quitar línea 1',exact:true}).click();

  console.log('Edición de tamaño y F5 correctos; comprobando Inca Kola y San Luis…');
  // Buscar un SKU concreto sigue ofreciendo todos los tamaños de esa marca.
  await buscar.fill('CARTA-FRI-GAS-1L');
  await page.getByRole('button',{name:'Añadir Inca Kola al pedido',exact:true}).click();
  bebida = page.getByRole('dialog');
  await bebida.getByRole('radio',{name:/^1 litro /}).waitFor();
  assert.ok(await bebida.getByRole('radio',{name:/^1 litro /}).isChecked());
  assert.equal(await bebida.getByRole('radio').count(),6);
  await bebida.getByRole('radio',{name:/^Gordita /}).check();
  await bebida.getByText('Precio de presentación: S/ 6.00',{exact:true}).waitFor();
  await bebida.getByRole('button',{name:'Cancelar',exact:true}).click();
  await buscar.fill('San Luis');
  await page.getByRole('button',{name:'Añadir Agua San Luis al pedido',exact:true}).click();
  bebida = page.getByRole('dialog');
  await bebida.getByRole('radio',{name:/^625 ml /}).waitFor();
  assert.equal(await bebida.getByRole('radio').count(),2);
  await bebida.getByRole('radio',{name:/^1 litro /}).check();
  await bebida.getByText('Precio de presentación: S/ 5.00',{exact:true}).waitFor();
  await page.setViewportSize({width:320,height:568});
  assert.ok(await bebida.evaluate(el => el.scrollWidth <= el.clientWidth));
  if(process.argv[3]) await page.screenshot({path:`${process.argv[3]}/san-luis-tamanos.png`});
  await bebida.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await buscar.fill('cecina');
  await page.getByRole('button', { name: 'Añadir Pizza súper especial de cecina al pedido', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('radio', { name: /Familiar/ }).check();
  await modal.getByText('S/ 41.00', { exact: true }).first().waitFor();
  await modal.getByRole('button', { name: /Añadir al pedido/ }).click();
  await page.reload();
  await page.getByText('S/ 41.00', { exact: true }).first().waitFor();
  if (process.argv[3]) {
    await mkdir(process.argv[3], { recursive: true });
    await page.screenshot({ path: `${process.argv[3]}/pos-carta.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const delivery = await context.request.get('http://localhost:5173/tarifas-delivery-carta.html');
  assert.equal(delivery.status(), 200);
  assert.ok((await delivery.text()).includes('Hualcará'));
  assert.deepEqual(errores, []);
  console.log('OK: 97 artículos en 87 tarjetas, foto remota cargada, cecina familiar S/41, F5, vista 390 px y tarifas. Nueve frozen y catorce tragos con imágenes distintas; tres tarjetas de marcas con selector, edición de tamaño, precios e IDs reales verificados. Sin credenciales reales.');
} finally {
  if (browser) await browser.close();
  if (usuario) {
    await AuthSesion.destroy({ where: { usuario_id: usuario.id } });
    await usuario.destroy();
  }
  await sequelize.close();
}
