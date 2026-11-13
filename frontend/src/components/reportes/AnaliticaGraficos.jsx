import {useRef} from 'react'
import {Bar,Doughnut} from 'react-chartjs-2'
import {useTemaStore} from '../../stores/tema.store.js'
import BotonBase from '../ui/BotonBase.jsx'
import {monedaReporte} from '../../utils/reportes.js'
const paleta=['#F59E0B','#EF4444','#84CC16','#38BDF8','#A78BFA','#FB7185','#2DD4BF','#F97316','#60A5FA','#E879F9']
const canales={salon:'Salón',llevar:'Para llevar',delivery:'Delivery'}
export function Grafico({titulo,nota,filas,moneda=false,dona=false,color=0,reporte,bloqueado}) {
  const ref=useRef(null),oscuro=useTemaStore(s=>s.tema)==='oscuro',tinta=oscuro?'#e2e8f0':'#334155'
  const hay=filas.some(f=>Number(f.valor)>0)
  // Las categorías a cero siguen en la tabla exacta; no necesitan una barra
  // vacía ni aumentar la altura del gráfico de horas.
  const filasGrafico=filas.filter(f=>Number(f.valor)>0)
  const opciones={responsive:true,maintainAspectRatio:false,animation:false,indexAxis:dona?'x':'y',plugins:{legend:{display:dona,position:'bottom',labels:{color:tinta}},title:{display:true,color:tinta,text:[titulo,`${reporte.filtros.desde} al ${reporte.filtros.hasta}`,`${reporte.filtros.canal??'Todos los canales'} · ${reporte.filtros.estado} · ${reporte.filtros.zona_horaria} · sesión ${reporte.filtros.sesion_id??'todas'} · responsable ${reporte.filtros.mesero_id??'todos'}`]},tooltip:{callbacks:{label:c=>`${filasGrafico[c.dataIndex].nombre}: ${moneda?monedaReporte(filasGrafico[c.dataIndex].valor):filasGrafico[c.dataIndex].valor}`}}},...(!dona?{scales:{x:{beginAtZero:true,ticks:{color:tinta,precision:moneda?2:0},grid:{color:oscuro?'#ffffff12':'#00000010'}},y:{ticks:{color:tinta,callback:(_v,i)=>filasGrafico[i]?.nombre.length>28?filasGrafico[i].nombre.slice(0,28)+'…':filasGrafico[i]?.nombre},grid:{display:false}}}}:{cutout:'66%'})}
  function png(){if(!bloqueado&&ref.current){const a=document.createElement('a');a.download=`veneziana-${titulo.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${reporte.filtros.desde}.png`;a.href=ref.current.toBase64Image();a.click()}}
  const Chart=dona?Doughnut:Bar
  // Leer opciones actualizadas: react-chartjs-2 conserva la instancia del plugin
  // entre temas, por lo que no debe capturar el tema inicial en una clausura.
  const fondo={id:'fondoAnalitica',beforeDraw(chart,_args,opts){const{ctx,width,height}=chart;ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=opts.color;ctx.fillRect(0,0,width,height);ctx.restore()}}
  opciones.plugins.fondoAnalitica={color:oscuro?'#1b2028':'#ffffff'}
  return <section className={`vz-report-panel vz-report-chart ${hay?'':'is-empty-chart'}`}><header><div><h2>{titulo}</h2><p>{nota}</p></div><BotonBase onClick={png} disabled={bloqueado||!hay} aria-label={`Descargar PNG de ${titulo}`}>PNG</BotonBase></header>
    <div className="vz-report-chart-viewport"><div className="vz-report-canvas" style={{height:hay?(dona?300:Math.max(300,filasGrafico.length*24+80)):140}}>{hay?<Chart ref={ref} plugins={[fondo]} role="img" aria-label={`${titulo}. Datos exactos en el detalle del gráfico.`} data={{labels:filasGrafico.map(f=>f.nombre),datasets:[{label:moneda?'S/':'Cantidad',data:filasGrafico.map(f=>Number(f.valor)),backgroundColor:filasGrafico.map((_,i)=>paleta[(color+i)%paleta.length]),borderWidth:0,maxBarThickness:28,borderRadius:dona?0:5}]}} options={opciones}/>:<p className="vz-report-vacio">No hay registros con estos filtros.</p>}</div></div>
    <details><summary>Ver datos exactos ({filas.length})</summary><div className="vz-report-scroll"><table><caption className="sr-only">{titulo}</caption><thead><tr><th>Concepto</th><th>{moneda?'S/':'Cantidad'}</th></tr></thead><tbody>{filas.map((f,i)=><tr key={i}><th scope="row">{f.nombre}</th><td>{moneda?monedaReporte(f.valor):f.valor}</td></tr>)}</tbody></table></div></details>
  </section>
}
export default function AnaliticaGraficos({reporte:r,bloqueado}) {
  const a=r.analitica
  if(!a)return <p className="vz-report-alerta">Actualiza el servidor y vuelve a consultar para cargar los nuevos análisis.</p>
  const comunes={reporte:r,bloqueado},max=Math.max(1,...a.calor.map(c=>c.cantidad))
  return <>
    <div className="vz-report-graficos">
      <Grafico {...comunes} titulo="Productos más vendidos" nota="Top 10 por unidades brutas; presentaciones agrupadas por producto." filas={a.productos_top.map(p=>({nombre:p.nombre,valor:p.unidades}))}/>
      <Grafico {...comunes} color={3} titulo="Productos de baja rotación" nota="Los 10 con menos unidades entre los que tuvieron ventas; ceros aparte." filas={a.productos_baja_rotacion.map(p=>({nombre:p.nombre,valor:p.unidades}))}/>
      <Grafico {...comunes} dona titulo="Ventas por canal" nota="Importe con impuesto de tickets de salón, para llevar y delivery." moneda filas={a.canales.map(c=>({nombre:canales[c.canal]??c.canal,valor:c.total}))}/>
      <Grafico {...comunes} color={2} titulo="Meseros · mesas atendidas" nota="Una cuenta cobrada de salón = una atención. Una mesa puede atenderse varias veces." filas={a.meseros.map(m=>({nombre:m.nombre,valor:String(m.atenciones)}))}/>
      <Grafico {...comunes} color={4} titulo="Ventas atribuidas al mesero" nota="Creador de la cuenta de salón; no el cajero ni el mesero asignado actualmente a la mesa." moneda filas={a.meseros.map(m=>({nombre:m.nombre,valor:m.total}))}/>
      <Grafico {...comunes} color={3} titulo="Horas con más ventas" nota={`Por hora de emisión · ${r.filtros.zona_horaria}.`} moneda filas={a.horas.map(h=>({nombre:`${String(h.hora).padStart(2,'0')}:00`,valor:h.total}))}/>
      <Grafico {...comunes} dona color={1} titulo="Categorías más solicitadas" nota="Unidades agrupadas con la categoría actual del catálogo." filas={a.categorias.map(c=>({nombre:c.nombre,valor:c.unidades}))}/>
      <section className="vz-report-panel"><header><div><h2>Productos sin ventas</h2><p>{a.sin_ventas.cantidad} productos activos sin unidades en la selección.</p></div><span className="vz-analytics-count">{a.sin_ventas.cantidad}</span></header><p className="vz-report-nota">También puede deberse al canal, responsable seleccionado o falta de stock.</p><div className="vz-zero-products">{a.sin_ventas.productos.map(p=><span key={p.producto_id}>{p.nombre}<strong>0</strong></span>)}{a.sin_ventas.cantidad===0&&<p>No hay productos activos sin ventas.</p>}</div>{a.sin_ventas.cantidad>50&&<p className="vz-report-nota">Se muestran 50 de {a.sin_ventas.cantidad}.</p>}</section>
    </div>
    <section className="vz-report-panel"><h2>Mapa de actividad · días y horas</h2><p className="vz-report-nota">Tickets acumulados por día de semana y hora. Mayor intensidad = más tickets.</p><div className="vz-heatmap" role="table" aria-label="Tickets por día de semana y hora"><div role="row" className="vz-heat-row"><span role="columnheader">Día</span>{Array.from({length:24},(_,h)=><span key={h} role="columnheader">{h%3===0?`${h}h`:''}</span>)}</div>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((dia,d)=><div key={dia} className="vz-heat-row" role="row"><strong role="rowheader">{dia}</strong>{Array.from({length:24},(_,h)=>{const c=a.calor.find(c=>c.dia===d&&c.hora===h),n=c?.cantidad??0;return <span key={h} role="cell" className="vz-heat-cell" style={{backgroundColor:`rgb(245 158 11 / ${n?0.15+0.85*n/max:0.04})`}} aria-label={`${dia} ${h}:00: ${n} tickets`} title={`${dia} ${h}:00 · ${n} tickets · ${monedaReporte(c?.total??'0.00')}`}>{n||''}</span>})}</div>)}</div></section>
    <p className="vz-report-nota">{a.alcance} Los rankings no comparan por sí solos turnos, tamaño de mesa o condiciones de trabajo.</p>
  </>
}
