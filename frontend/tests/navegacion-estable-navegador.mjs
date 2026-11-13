// Comprobar desplazamiento real al navegar entre secciones largas y cortas.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime = process.argv[2] ?? 'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(runtime).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errores = []
page.on('pageerror', e => errores.push(e.message))
const permisos = [['seguridad','gestionar'],['reportes','leer'],['catalogo','gestionar'],['kds','operar'],['mesas','gestionar'],['ventas','cobrar'],['caja','gestionar'],['clientes','buscar'],['inventario','gestionar']].map(([modulo,accion]) => ({modulo,accion}))
await page.route('**/api/**', route => {
  const sesion = new URL(route.request().url()).pathname.endsWith('/auth/session')
  // Los estados de error también deben conservar la estructura del menú.
  return route.fulfill({status:sesion?200:503,json:sesion?{usuario:{id:9898,nombre:'Prueba navegación',rol:{nombre:'administrador'},permisos}}:{mensaje:'Consulta temporalmente no disponible.'}})
})
const base = process.env.TEST_BASE_URL ?? 'http://localhost:5173'
try {
  for (const [width,height] of [[1366,768],[1280,720],[1024,600]]) {
    await page.setViewportSize({width,height})
    await page.goto(base+'/componentes')
    const menu = page.getByRole('navigation',{name:'Navegación principal'})
    await menu.waitFor()
    await page.evaluate(()=>{window.menuOriginal=document.querySelector('.vz-sidebar')})
    const rutas = await menu.getByRole('link').evaluateAll(enlaces=>enlaces.map(e=>e.getAttribute('href')))
    const x = await page.locator('.vz-main').evaluate(e=>e.getBoundingClientRect().x)
    for (const ruta of rutas) {
      // Un contenido desplazado no debe dejar la nueva sección a mitad de página.
      await page.evaluate(()=>window.scrollTo(0,300))
      await menu.locator(`a[href="${ruta}"]`).click()
      await page.waitForURL('**'+ruta)
      const posicion=await page.evaluate(()=>{
        const menu=document.querySelector('.vz-sidebar'), main=document.querySelector('.vz-main')
        return {y:scrollY,top:menu.getBoundingClientRect().top,height:menu.clientHeight,x:main.getBoundingClientRect().x,same:menu===window.menuOriginal,overflow:document.documentElement.scrollWidth>innerWidth}
      })
      assert.equal(posicion.y,0,`${ruta}: scroll de la página`)
      assert.equal(posicion.top,80,`${ruta}: menú desplazado`)
      assert.ok(posicion.height<=height-80)
      assert.equal(posicion.x,x,`${ruta}: salto lateral`)
      assert.ok(posicion.same,`${ruta}: menú reconstruido`)
      assert.ok(!posicion.overflow)
    }
    // El scroll que eligió el usuario en el menú se conserva al cambiar de página.
    await page.locator('.vz-sidebar').evaluate(e=>{e.scrollTop=120})
    const scrollMenu=await page.locator('.vz-sidebar').evaluate(e=>e.scrollTop)
    await menu.locator('a[href="/cocina"]').click()
    assert.equal(await page.locator('.vz-sidebar').evaluate(e=>e.scrollTop),scrollMenu)
  }
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844})
    await page.goto(base+'/inicio')
    await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
    await page.getByRole('navigation').getByRole('link',{name:'Recetas',exact:true}).click()
    await page.getByRole('button',{name:'Abrir menú',exact:true}).waitFor()
    assert.equal(await page.locator('.vz-sidebar').isVisible(),false)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    assert.equal(await page.evaluate(()=>scrollY),0)
  }
  assert.deepEqual(errores,[])
  console.log('OK: menú estable en todas las secciones, scroll independiente conservado, sin saltos laterales, laptop y menú móvil.')
} finally { await browser.close() }
