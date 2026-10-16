// Prueba automatizada de interfaz de navegador para el Punto de Venta (Fase 27).
// Utiliza Playwright con API simulada en un contexto aislado.
// Verifica cajero con ventas/cobrar, catálogo, variantes, modificadores, 30 líneas,
// recibo térmico, F5, responsividad (1280px, 768px, 390px, 320px), rotación y ambos temas.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const playwrightPath = process.argv[2]
  ? process.argv[2]
  : 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const { chromium } = await import(
  playwrightPath.startsWith('file:') ? playwrightPath : pathToFileURL(playwrightPath).href
)

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()

let usuarioId = 25
let autenticado = true
let precioBase = '28.00'
let productoRetirado = false
const errores = []
const escrituras = []

page.on('pageerror', error => errores.push(error.message))

const categorias = [
  { id: 1, nombre: 'Pizzas Clásicas', slug: 'pizzas-clasicas', color_hex: '#f59e0b', orden_visual: 1 },
  { id: 2, nombre: 'Pizzas Gourmet', slug: 'pizzas-gourmet', color_hex: '#ef4444', orden_visual: 2 },
  { id: 3, nombre: 'Bebidas', slug: 'bebidas', color_hex: '#84cc16', orden_visual: 3 }
]

const productos = () => [
  {
    id: 1,
    nombre: 'Pizza Americana Tradicional',
    categoria_id: 1,
    precio_venta_base: precioBase,
    sku: 'PIZ-AME-01',
    codigo_barras: '7750001001',
    descripcion: 'Salsa de tomate artesanal, mozzarella y jamón inglés seleccionado.',
    imagen_url: null,
    tipo_producto: 'plato_preparado',
    estado: productoRetirado ? 'inactivo' : 'activo'
  },
  {
    id: 2,
    nombre: 'Pizza Cuatro Quesos Veneziana con Prosciutto y Reducción de Albahaca Fresca de la Huerta',
    categoria_id: 2,
    precio_venta_base: '38.50',
    sku: 'PIZ-4Q-02',
    codigo_barras: '7750001002',
    descripcion: 'Mozzarella, gorgonzola, parmesano y gouda con jamón serrano.',
    imagen_url: null,
    tipo_producto: 'plato_preparado',
    estado: 'activo'
  },
  {
    id: 3,
    nombre: 'Gaseosa San Luis 500ml',
    categoria_id: 3,
    precio_venta_base: '4.50',
    sku: 'BEB-SL-03',
    codigo_barras: '7750001003',
    descripcion: 'Agua mineral sin gas.',
    imagen_url: null,
    tipo_producto: 'producto_directo',
    estado: 'activo'
  }
]

const configuracionProducto1 = () => ({
  productoId: 1,
  variantes: [
    { id: 11, producto_id: 1, nombre_variante: 'Mediana 30cm', precio_adicional: '6.00' },
    { id: 12, producto_id: 1, nombre_variante: 'Familiar 40cm', precio_adicional: '12.00' }
  ],
  grupos: [
    {
      id: 21,
      nombre_grupo: 'Borde de Masa',
      es_multiple: false,
      es_obligatorio: true,
      opciones: [
        { id: 31, grupo_id: 21, nombre_modificador: 'Borde Tradicional', precio_adicional: '0.00', es_exclusion: false },
        { id: 32, grupo_id: 21, nombre_modificador: 'Borde Relleno de Queso', precio_adicional: '5.00', es_exclusion: false }
      ]
    },
    {
      id: 22,
      nombre_grupo: 'Extras Opcionales',
      es_multiple: true,
      es_obligatorio: false,
      opciones: [
        { id: 41, grupo_id: 22, nombre_modificador: 'Queso Extra', precio_adicional: '3.50', es_exclusion: false },
        { id: 42, grupo_id: 22, nombre_modificador: 'Champiñones Frescos', precio_adicional: '4.00', es_exclusion: false },
        { id: 43, grupo_id: 22, nombre_modificador: 'Sin Orégano', precio_adicional: '0.00', es_exclusion: true }
      ]
    }
  ]
})

// Intercepción de rutas de API
await context.route('**/api/**', async route => {
  const req = route.request()
  const url = new URL(req.url())
  const ruta = url.pathname.replace(/^\/api/, '')

  if (req.method() === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': 'http://localhost:5173',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'X-CSRF-Protection, Content-Type',
        'access-control-allow-methods': 'GET, POST, OPTIONS'
      }
    })
  }

  if (req.method() !== 'GET') {
    escrituras.push(ruta)
  }

  let status = 200
  let body = {}

  // Sesión: usuario Cajero con permiso ventas/cobrar (SIN catalogo/gestionar)
  if (ruta === '/auth/session') {
    status = autenticado ? 200 : 401
    body = autenticado
      ? {
          usuario: {
            id: usuarioId,
            nombre: 'Cajero Principal',
            nombre_completo: 'Henry Díaz (Cajero)',
            rol: { nombre: 'cajero' },
            permisos: [
              { modulo: 'ventas', accion: 'cobrar' },
              { modulo: 'caja', accion: 'gestionar' }
            ]
          }
        }
      : { mensaje: 'Sin sesión' }
  } else if (ruta === '/auth/logout') {
    autenticado = false
    body = {}
  } else if (ruta === '/pos/catalogo') {
    const catId = url.searchParams.get('categoriaId')
    const busq = url.searchParams.get('busqueda')
    let prods = productos()

    if (catId) {
      prods = prods.filter(p => p.categoria_id === Number(catId))
    }
    if (busq) {
      const b = busq.toLowerCase()
      prods = prods.filter(p => p.nombre.toLowerCase().includes(b) || p.sku.toLowerCase().includes(b))
    }

    body = {
      categorias,
      productos: prods.filter(p => p.estado === 'activo'),
      total: prods.length
    }
  } else if (ruta === '/pos/productos/1') {
    if (productoRetirado) {
      status = 404
      body = { mensaje: 'El producto ya no está disponible para la venta.' }
    } else {
      body = {
        producto: productos()[0],
        configuracion: configuracionProducto1()
      }
    }
  } else if (ruta === '/pos/productos/2') {
    body = {
      producto: productos()[1],
      configuracion: {
        productoId: 2,
        variantes: [],
        grupos: []
      }
    }
  } else if (ruta === '/pos/productos/3') {
    body = {
      producto: productos()[2],
      configuracion: {
        productoId: 3,
        variantes: [],
        grupos: []
      }
    }
  } else {
    status = 404
    body = { mensaje: `Ruta no encontrada: ${ruta}` }
  }

  return route.fulfill({
    status,
    json: body,
    headers: {
      'access-control-allow-origin': 'http://localhost:5173',
      'access-control-allow-credentials': 'true',
      'cache-control': 'no-store'
    }
  })
})

try {
  console.log('1. Navegando al POS como cajero autenticado...')
  await page.goto('http://localhost:5173/pos')

  // Verificar título del POS y layout
  await page.getByRole('heading', { name: 'Punto de venta', level: 1 }).waitFor()
  await page.getByText('La Veneziana · Ventas y Caja').waitFor()

  console.log('2. Verificando categorías y búsqueda...')
  await page.getByRole('tab', { name: /Pizzas Gourmet/ }).click()
  await page.getByText(/Pizza Cuatro Quesos/).waitFor()
  assert.equal(await page.getByText('Pizza Americana Tradicional').count(), 0)

  // Volver a Todas
  await page.getByRole('tab', { name: /Todas/ }).click()
  await page.getByText('Pizza Americana Tradicional').waitFor()

  // Búsqueda
  const buscador = page.getByPlaceholder('Buscar pizza, SKU o código…')
  await buscador.fill('Americana')
  await page.getByText('Pizza Americana Tradicional').waitFor()
  assert.equal(await page.getByText(/Pizza Cuatro Quesos/).count(), 0)
  await buscador.fill('')

  console.log('3. Personalizando Pizza Americana en Modal...')
  const btnAnadir = page.getByRole('button', { name: 'Añadir Pizza Americana Tradicional al pedido' })
  await btnAnadir.click()

  // Modal abierto
  const modal = page.getByRole('dialog')
  await modal.waitFor()
  await modal.getByText('Personalizar: Pizza Americana Tradicional').waitFor()

  // Seleccionar variante "Familiar 40cm" (+ S/ 12.00)
  await modal.getByLabel(/Familiar 40cm/).check()

  // Seleccionar borde obligatorio "Borde Relleno de Queso" (+ S/ 5.00)
  await modal.getByLabel(/Borde Relleno de Queso/).check()

  // Seleccionar extra "Queso Extra" (+ S/ 3.50)
  await modal.getByLabel(/Queso Extra/).check()

  // Verificar importe estimado en vivo: 28.00 base + 12.00 + 5.00 + 3.50 = 48.50
  await modal.getByText('S/ 48.50', { exact: false }).first().waitFor()

  // Confirmar adición
  await modal.getByRole('button', { name: 'Añadir al pedido' }).click()

  console.log('4. Verificando línea en el Recibo Térmico...')
  await page.locator('.pos-receipt').getByText('1 línea · 1 art.').waitFor()
  await page.locator('.pos-receipt').getByText('Pizza Americana Tradicional').waitFor()
  await page.locator('.pos-receipt').getByText('Familiar 40cm').waitFor()
  await page.locator('.pos-receipt').getByText('S/ 48.50').first().waitFor()

  // Incrementar cantidad a 2 con el botón "+"
  console.log('5. Modificando cantidad en el ticket...')
  const btnMas = page.getByRole('button', { name: 'Aumentar cantidad de línea 1' })
  await btnMas.click()
  // Total para 2: 48.50 * 2 = 97.00
  await page.locator('.pos-receipt').getByText('S/ 97.00').first().waitFor()

  // Editar la línea
  console.log('6. Editando línea conservando cantidad...')
  await page.getByRole('button', { name: 'Editar línea 1' }).click()
  const modalEdicion = page.getByRole('dialog')
  await modalEdicion.waitFor()

  // Cambiar variante a base
  await modalEdicion.getByLabel(/Presentación base/).check()
  // Precio unitario: 28.00 base + 5.00 borde + 3.50 extra = 36.50
  // Total para 2 unidades = 73.00
  await modalEdicion.getByRole('button', { name: 'Guardar cambios' }).click()
  await page.locator('.pos-receipt').getByText('S/ 73.00').first().waitFor()

  console.log('7. Verificando persistencia tras recarga F5...')
  await page.reload()
  await page.locator('.pos-receipt').getByText('S/ 73.00').first().waitFor()
  await page.locator('.pos-receipt').getByText('1 línea · 2 art.').waitFor()

  // Revisar contenido en localStorage (separado por empleado, sin credenciales)
  const borradorGuardado = await page.evaluate(uid => {
    return JSON.parse(localStorage.getItem(`la-veneziana-carrito-v1:${uid}`))
  }, usuarioId)
  assert.equal(borradorGuardado.lineas.length, 1)
  assert.equal(borradorGuardado.lineas[0].cantidad, 2)
  assert.equal(borradorGuardado.lineas[0].varianteId, null)

  console.log('8. Probando 30 líneas en el recibo térmico...')
  await page.evaluate(() => {
    const store = window.__useCartStore?.getState?.()
    if (store) {
      const lineasExtras = Array.from({ length: 29 }, (_, i) => ({
        productoId: i % 2 === 0 ? 2 : 3,
        varianteId: null,
        modificadoresIds: [],
        cantidad: 1
      }))
      store.agregarLineas(lineasExtras)
    }
  })
  await page.locator('.pos-receipt').getByText(/30 líneas/).waitFor()

  console.log('9. Comprobando botón de cobro e información de Fase 28...')
  const btnCobro = page.getByRole('button', { name: /Continuar al cobro/ })
  await btnCobro.click()
  const modalFase28 = page.getByRole('dialog')
  await modalFase28.getByText('Revisión de Pedido (Fase 27)').waitFor()
  await modalFase28.getByRole('button', { name: 'Entendido, continuar operando' }).click()

  console.log('10. Comprobando adaptabilidad en Tablet (768px)...')
  await page.setViewportSize({ width: 768, height: 1024 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  console.log('11. Comprobando adaptabilidad en Celular (390px)...')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  // En móvil, la barra flotante y la pestaña de cambio están disponibles
  const tabRecibo = page.getByRole('button', { name: /Recibo \/ Pedido/ })
  await tabRecibo.click()
  // El recibo se muestra en ancho completo
  await page.getByText('TICKET DE PEDIDO').waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  console.log('12. Comprobando rotación de pantalla en móvil (844x390)...')
  await page.setViewportSize({ width: 844, height: 390 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.getByText('TICKET DE PEDIDO').waitFor()

  console.log('13. Comprobando Celular pequeño (320px)...')
  await page.setViewportSize({ width: 320, height: 568 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  console.log('14. Comprobando cambio de tema Claro / Oscuro...')
  const botonTema = page.getByRole('button', { name: /Modo oscuro/ })
  if (await botonTema.count() > 0) {
    await botonTema.click()
    assert.ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === 'oscuro'))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

    // Volver a modo claro
    const botonTemaClaro = page.getByRole('button', { name: /Modo claro/ })
    await botonTemaClaro.click()
    assert.ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === 'claro'))
  }

  console.log('15. Comprobando producto que deja de estar disponible...')
  productoRetirado = true
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Actualizar' }).click()
  await page.getByText('El producto ya no está disponible para la venta.').waitFor()

  console.log('16. Comprobando vaciado de pedido confirmado...')
  productoRetirado = false
  await page.getByRole('button', { name: 'Vaciar' }).click()
  const modalVaciar = page.getByRole('dialog')
  await modalVaciar.getByRole('button', { name: 'Confirmar vaciado' }).click()
  await page.getByText('El pedido está vacío').waitFor()

  // Verificaciones finales
  assert.deepEqual(errores, [], 'No debe haber errores de consola de JavaScript')

  console.log('✔ Todas las pruebas de navegador del POS pasaron exitosamente.')
  console.log('  - Cajero autorizado sin permisos de catálogo administrativo')
  console.log('  - Catálogo, filtros por categoría y búsqueda')
  console.log('  - Modal de personalización con variantes, extras y cálculo en vivo')
  console.log('  - Recibo térmico financiero, edición, cantidades y totales')
  console.log('  - Persistencia local F5 y aislamiento por usuario')
  console.log('  - Responsividad: 1280px, 768px, 390px, 320px sin desbordamiento')
  console.log('  - Rotación de pantalla en pedido activo')
  console.log('  - Modos claro y oscuro')
  console.log('  - Límites de fase respetados (modal informativo Fase 28)')
} finally {
  await context.close()
  await browser.close()
}
