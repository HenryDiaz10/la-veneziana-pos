// Dos sesiones aisladas: mesero registra; cajero consulta y cobra el mismo pedido.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const runtime=process.argv[2]??'C:/Users/Henry/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const {chromium}=await import(pathToFileURL(runtime).href)
const browser=await chromium.launch({channel:'msedge',headless:true})
const base=process.env.TEST_BASE_URL??'http://localhost:5173'
const mesero={id:9875,nombre:'Mesero prueba',rol:{nombre:'mesero'},permisos:[{modulo:'pedidos',accion:'crear'},{modulo:'mesas',accion:'gestionar'}]}
const cajero={id:9876,nombre:'Cajero prueba',rol:{nombre:'cajero'},permisos:[{modulo:'ventas',accion:'cobrar'},{modulo:'caja',accion:'gestionar'}]}
const producto={id:7,nombre:'Caldo de gallina',estado:'activo',precio_venta_base:'14.00',tipo_producto:'plato_preparado',imagen_url:null}
const config={productoId:7,variantes:[],grupos:[]}
const errores=[], solicitudes=[]
let creado=null,altas=0,cobros=0,version=1,pagada=false,clave
async function contexto(usuario){
  const c=await browser.newContext({viewport:{width:1366,height:900}})
  await c.route('**/api/**',async route=>{
    const req=route.request(),ruta=new URL(req.url()).pathname.replace(/^\/api/,'')
    solicitudes.push({usuario:usuario.id,ruta,metodo:req.method()})
    let body
    if(ruta==='/auth/session')body={usuario}
    else if(ruta==='/salon')body={consultado_en:new Date().toISOString(),zonas:[{id:1,nombre:'Salón',aforo_maximo:20}],mesas:[{id:5,zona_id:1,codigo_mesa:'M05',capacidad_sillas:4,estado_actual:creado?'ocupada':'libre',mesero_asignado_id:creado?mesero.id:null,posicion_x:0,posicion_y:0,pedido_abierto:creado?{id:'42',codigo_pedido:'P-MESERO',estado_cuenta:'abierta'}:null}]}
    else if(ruta==='/pos/catalogo')body={categorias:[],productos:[producto],total:1}
    else if(ruta==='/pos/productos/7')body={producto,configuracion:config}
    else if(ruta==='/pedidos/registro')body={mesas:[{id:5,codigo_mesa:'M05'},{id:6,codigo_mesa:'M06'}].filter(m=>!creado||creado.mesa_id!==m.id)}
    else if(ruta==='/pedidos'&&req.method()==='POST'){
      altas++;creado=req.postDataJSON();clave=req.headers()['idempotency-key']
      assert.equal(usuario.id,mesero.id);assert.equal(creado.tipo_atencion,'salon');assert.equal(creado.mesa_id,5)
      // Respuesta perdida: el pedido existe en servidor pero la UI debe recuperar.
      return route.abort('failed')
    }
    else if(ruta===`/pedidos/operaciones/pedido.crear/${clave}`)body={pedido:{id:'42',codigo_pedido:'P-MESERO',estado_cuenta:'abierta',version}}
    else if(ruta==='/caja/sesion')body={cajas:[],sesion:{id:1,apertura_monto_base:'100.00'}}
    else if(ruta==='/pedidos/42/contexto-pago')body={pedido:{id:'42',codigo_pedido:'P-MESERO',total:'14.00',version,estado_cuenta:pagada?'pagada':version>1?'bloqueada_en_pago':'abierta',bloqueo_propio:version>1,bloqueo_hasta:new Date(Date.now()+300000).toISOString()},sesion_caja:{id:1,nombre_caja:'Caja prueba'},finanzas_habilitadas:true,canje:{disponible:false}}
    else if(ruta==='/pedidos/42/bloqueo-pago'){version++;body={pedido:{id:'42',version}}}
    else if(ruta==='/pedidos/42/cobro'){
      assert.equal(usuario.id,cajero.id);cobros++;pagada=true
      body={venta:{id:'77',pedido_id:'42',total:'14.00',serie_correlativo:'T-MESERO'},pedido:{id:'42',estado_cuenta:'pagada'}}
    }else throw new Error(`Ruta inesperada: ${ruta}`)
    await route.fulfill({json:body})
  })
  const p=await c.newPage();p.on('pageerror',e=>errores.push(e.message));return {c,p}
}
try{
  const {c:cm,p:m}=await contexto(mesero)
  await m.goto(base+'/salon')
  await m.getByRole('button',{name:/^Mesa M05,/}).click()
  await m.getByRole('link',{name:'Tomar pedido en esta mesa',exact:true}).click()
  await m.getByRole('heading',{name:'Tomar pedido',exact:true}).waitFor()
  assert.equal(await m.getByRole('navigation').getByRole('link',{name:'Pagos de pedidos'}).count(),0)
  await m.getByRole('button',{name:'Añadir Caldo de gallina al pedido',exact:true}).click()
  await m.getByLabel(/Indicaciones para cocina/).fill('Pierna, sin cebolla')
  await m.getByRole('button',{name:'Añadir al pedido',exact:true}).click()
  assert.equal(await m.getByLabel('Mesa disponible',{exact:true}).inputValue(),'5')
  await m.getByLabel('Indicaciones generales').fill('Cliente en mesa 5')
  await m.getByRole('button',{name:'Registrar pedido',exact:true}).click()
  await m.getByRole('button',{name:'Confirmar registro',exact:true}).click()
  await m.getByRole('button',{name:'Recuperar resultado',exact:true}).waitFor()
  assert.equal(altas,1);assert.equal(cobros,0)
  assert.equal(creado.lineas[0].indicaciones,'Pierna, sin cebolla')
  await m.reload()
  await m.getByRole('button',{name:'Recuperar resultado',exact:true}).click()
  await m.getByText(/Pedido P-MESERO enviado a cocina/).waitFor()
  assert.equal(await m.locator('.pos-receipt-line').count(),0)
  assert.equal(await m.getByRole('link',{name:/Cobrar/}).count(),0)
  const registro=await m.evaluate(()=>JSON.parse(localStorage.getItem('la-veneziana-comercial-v1:9875')))
  assert.equal(registro.pendiente,null);assert.deepEqual(registro.vinculos,{})
  // El siguiente borrador se puede preparar antes de que el cajero cobre el anterior.
  await m.getByRole('button',{name:'Añadir Caldo de gallina al pedido',exact:true}).click()
  await m.getByRole('button',{name:'Añadir al pedido',exact:true}).click()
  await m.getByLabel('Mesa disponible',{exact:true}).selectOption('6')
  assert.ok(await m.getByRole('button',{name:'Registrar pedido',exact:true}).isEnabled())
  for(const width of [390,320]){
    await m.setViewportSize({width,height:844})
    if(await m.getByRole('button',{name:/Recibo \/ Pedido/}).isVisible())await m.getByRole('button',{name:/Recibo \/ Pedido/}).click()
    assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  }
  // Una URL de cobro nunca concede al mesero ese permiso.
  await m.goto(base+'/pagos?pedido=42')
  await m.getByRole('heading',{name:'No tienes acceso a esta sección',exact:true}).waitFor()
  const {c:cc,p:c}=await contexto(cajero)
  await c.goto(base+'/pagos?pedido=42')
  await c.getByRole('button',{name:'Distribuir pago',exact:true}).click()
  await c.getByRole('dialog').getByLabel('Efectivo recibido (S/)',{exact:true}).fill('20')
  await c.getByRole('button',{name:'Preparar distribución',exact:true}).click()
  await c.getByRole('button',{name:'Confirmar cobro',exact:true}).click()
  await c.getByRole('region',{name:'Último cobro confirmado'}).waitFor()
  assert.equal(altas,1);assert.equal(cobros,1)
  await m.goto(base+'/salon')
  await m.getByRole('button',{name:/^Mesa M05,/}).click()
  await m.getByRole('dialog').getByText(/Pedido P-MESERO/).waitFor()
  assert.equal(await m.getByRole('dialog').getByRole('link',{name:/Cobrar/}).count(),0)
  assert.equal(solicitudes.filter(r=>r.usuario===mesero.id&&/cobro|contexto-pago|^\/caja/.test(r.ruta)).length,0)
  assert.equal((await m.evaluate(()=>JSON.parse(localStorage.getItem('la-veneziana-carrito-v1:9875')))).lineas.length,1)
  assert.deepEqual(errores,[])
  await cm.close();await cc.close()
  console.log('OK: mesero toma pedido, mesa/notas, F5 y respuesta perdida sin duplicar, nuevo borrador antes del cobro, cajero cobra en sesión separada, bloqueo por URL y móvil.')
}finally{await browser.close()}
