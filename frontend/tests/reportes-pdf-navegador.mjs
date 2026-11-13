import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import {reporteFixture,analiticaFixture,actividadFixture} from './reportes-fixture.mjs'
const {chromium}=await import(pathToFileURL(process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href)
const carpeta=process.argv[3]??'C:/Users/Henry/Documents/Codex/work/pdf-reportes-vistas'
await mkdir(carpeta,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true}),ctx=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage()
const errores=[];let sinActividad=false,sinClientes=false,impresos=0
page.on('pageerror',e=>errores.push(e.message));await page.clock.setFixedTime(new Date('2026-11-13T18:00:00Z'))
await ctx.addInitScript(()=>{window.print=()=>{window.pruebasImpresion=(window.pruebasImpresion??0)+1}})
await ctx.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  let body
  if(path.endsWith('/auth/session'))body={usuario:{id:1,nombre:'Administrador de pruebas',rol:{nombre:'administrador'},permisos:[{modulo:'reportes',accion:'leer'}]}}
  else if(path.endsWith('/gastos/categorias'))body={categorias:[{id:1,nombre:'Servicios básicos'}]}
  else if(path.endsWith('/gastos'))body={gastos:[{id:1,categoria_id:1,descripcion:'Servicio de agua - noviembre',monto_gasto:'2.00',fecha_gasto:'2026-11-13',clasificacion:'operativo',movimiento_caja_id:null,comprobante_fiscal:'RECIBO-PRUEBA'}],paginacion:{siguiente:null}}
  else{
    body=reporteFixture();body.filtros.hasta='2026-11-13';body.analitica=analiticaFixture();body.actividad_financiera=actividadFixture()
    body.compras={cantidad:1,total:'118.00',saldadas:'118.00',pendientes_sin_abonos:'0.00',parciales:0,total_documentos_parciales:'0.00',saldo_pendiente:'0.00'}
    if(sinActividad){body.analitica.horas=body.analitica.horas.map(h=>({...h,total:'0.00',cantidad:0}));body.analitica.meseros=[];body.gastos.por_clase={operativo:'0.00',financiero:'0.00',extraordinario:'0.00',provision_impuesto:'0.00'}}
    if(sinClientes){
      const c=body.clientes
      for(const k of Object.keys(c.resumen))c.resumen[k]=typeof c.resumen[k]==='number'?0:'0.00'
      for(const k of ['ranking_ingresos','ranking_frecuencia','ranking_unidades','evolucion','productos'])c[k]=[]
    }
  }
  await route.fulfill({json:body})
})
try{
  for(const [ruta,vistas] of [['reportes',['Resumen','Ventas y atención','Mis clientes','Compras y gastos','Documentos y caja']],['estado-resultados',['Resultado del negocio','Compras y gastos','Documentos y caja']]]){
    await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/'+ruta)
    await page.getByRole('navigation',{name:'Contenido del reporte'}).waitFor()
    if(ruta==='estado-resultados')await page.getByRole('button',{name:'Activar modo oscuro',exact:true}).click()
    const tituloOriginal=await page.title()
    for(const [i,vista] of vistas.entries()){
      await page.getByRole('navigation',{name:'Contenido del reporte'}).getByRole('button',{name:vista,exact:true}).click()
      const elementos=await page.locator('.vz-report-contenido canvas').count()
      const anterior=await page.evaluate(()=>window.pruebasImpresion??0)
      await page.getByRole('button',{name:'Guardar vista en PDF',exact:true}).click()
      await page.waitForFunction(prev=>window.pruebasImpresion>prev&&[...document.querySelectorAll('#vz-reporte-impresion img')].every(i=>i.complete),anterior)
      const salida=page.locator('#vz-reporte-impresion')
      assert.equal(await salida.locator('canvas,button').count(),0)
      assert.equal(await salida.locator('img').count(),elementos)
      assert.ok((await page.title()).includes(vista));assert.ok((await salida.textContent()).includes('2026-11-01 al 2026-11-13'))
      if(vista==='Resumen')assert.equal(await salida.getByRole('heading',{name:'Productos más vendidos'}).count(),0)
      if(vista==='Resultado del negocio'){
        assert.ok((await salida.textContent()).includes('Detalle de los gastos'))
        assert.ok((await salida.textContent()).includes('Servicio de agua - noviembre'))
        assert.ok((await salida.textContent()).includes('Servicios básicos'))
        assert.ok((await salida.textContent()).includes('RECIBO-PRUEBA'))
        assert.ok((await salida.textContent()).includes('Total de esta página:'))
      }
      await page.emulateMedia({media:'print'})
      assert.equal(await salida.evaluate(el=>getComputedStyle(el).display),'block')
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light','PDF siempre con papel claro')
      await page.pdf({path:`${carpeta}/${ruta}-${i+1}.pdf`,format:'A4',printBackground:true,preferCSSPageSize:true})
      // page.pdf emite afterprint en Chromium; si no lo hizo, simular el cierre.
      await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')))
      await page.emulateMedia({media:'screen'})
      assert.equal(await salida.count(),0);assert.equal(await page.title(),tituloOriginal)
      assert.equal(await page.locator('.vz-report-contenido canvas').count(),elementos)
      assert.ok(!(await page.getByRole('button',{name:'Guardar vista en PDF',exact:true}).isDisabled()));impresos++
    }
  }
  await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/estado-resultados')
  await page.getByRole('heading',{name:'Detalle de los gastos',exact:true}).waitFor()
  await page.getByText('Servicio de agua - noviembre',{exact:true}).waitFor()
  for(const width of [320,390,768,1366,1920]){
    await page.setViewportSize({width,height:1000})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Desbordamiento en detalle de gastos')
  }
  await page.locator('.vz-report-panel').filter({has:page.getByRole('heading',{name:'Detalle de los gastos',exact:true})}).screenshot({path:`${carpeta}/detalle-gastos.png`})
  // Reproducir las dos capturas: cero meseros/24 horas a cero, y proveedor
  // con datos junto a gastos vacíos. Verificar tamaño y alineación de tarjetas.
  sinActividad=true;await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:5173')+'/reportes')
  await page.getByRole('navigation',{name:'Contenido del reporte'}).waitFor()
  for(const width of [320,390,768,1366,1920])for(const tema of ['claro','oscuro'])for(const vista of ['Ventas y atención','Mis clientes','Compras y gastos']){
    await page.setViewportSize({width,height:1000})
    if(await page.evaluate(()=>document.documentElement.dataset.tema)!==tema)await page.getByRole('button',{name:`Activar modo ${tema}`,exact:true}).click()
    await page.getByRole('navigation',{name:'Contenido del reporte'}).getByRole('button',{name:vista,exact:true}).click()
    await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth)
    const tarjetas=await page.locator('.is-empty-chart').evaluateAll(xs=>xs.map(x=>({alto:x.getBoundingClientRect().height,area:x.querySelector('.vz-report-canvas').getBoundingClientRect().height})))
    if(vista==='Ventas y atención')assert.ok(tarjetas.length)
    else if(vista==='Compras y gastos')await page.getByRole('heading',{name:'Compras y otros gastos',exact:true}).waitFor()
    else {
      assert.equal(await page.locator('.vz-report-contenido canvas').count(),7)
      await page.getByRole('heading',{name:'Detalle de mis clientes · Top 20 por ingreso neto',exact:true}).waitFor()
    }
    assert.ok(tarjetas.every(t=>t.area<=310&&t.alto<580),'Panel vacío gigante '+JSON.stringify(tarjetas))
    const cabeceras=await page.locator('.vz-report-chart>header').evaluateAll(xs=>xs.map(h=>({boton:h.querySelector('button').getBoundingClientRect(),texto:h.querySelector('div').getBoundingClientRect()})))
    assert.ok(cabeceras.every(h=>h.boton.x>=h.texto.right-1),'PNG no alineado')
    if(width===1366&&tema==='oscuro'){
      const grid=page.locator('.vz-report-graficos').last();await grid.screenshot({path:`${carpeta}/${vista.replaceAll(' ','-')}.png`})
    }
    if(vista==='Mis clientes'&&width===390&&tema==='claro')await page.locator('.vz-report-contenido').screenshot({path:`${carpeta}/clientes-movil.png`})
  }
  sinClientes=true;await page.reload()
  await page.getByRole('navigation',{name:'Contenido del reporte'}).getByRole('button',{name:'Mis clientes',exact:true}).click()
  await page.getByText('No hay compras con un cliente identificado en estos filtros.',{exact:false}).waitFor()
  assert.equal(await page.locator('.vz-report-contenido .is-empty-chart').count(),7)
  assert.equal(await page.getByRole('button',{name:'Guardar vista en PDF',exact:true}).isDisabled(),false)
  assert.equal(impresos,8);assert.deepEqual(errores,[])
  console.log('OK: ocho vistas exportadas con gráficos, título, periodo y limpieza; tarjetas vacías compactas, encabezados alineados y diseño 320-1920 en ambos temas.')
}finally{await browser.close()}
