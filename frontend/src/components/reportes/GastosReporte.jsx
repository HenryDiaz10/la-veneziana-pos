import { useEffect, useMemo, useState } from 'react'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarGastosReporte, consultarCategoriasReporte } from '../../services/reportes.service.js'
import { CLASES_REPORTE, monedaReporte } from '../../utils/reportes.js'
import BotonBase from '../ui/BotonBase.jsx'

export default function GastosReporte({ filtros, uid, onEstado, titulo='Gastos registrados' }) {
  const [cursores, setCursores] = useState([null])
  const solicitud = useMemo(() => ({ uid, filtros, despues: cursores.at(-1) }), [uid, filtros, cursores])
  const identidad = useMemo(() => ({ uid }), [uid])
  const categorias = useConsultaRemota(consultarCategoriasReporte, identidad)
  const { datos, error, pendiente, reintentar } = useConsultaRemota(consultarGastosReporte, solicitud, { conservarDatos: true, claveDatos: uid })
  const bloqueado=pendiente||Boolean(error)||categorias.pendiente||Boolean(categorias.error)||!datos
  useEffect(()=>{onEstado?.(bloqueado)},[onEstado,bloqueado])
  const total=datos?.gastos.reduce((s,g)=>s+BigInt(g.monto_gasto.replace('.','')),0n)??0n
  const totalTexto=`${total/100n}.${String(total%100n).padStart(2,'0')}`
  return <section className="vz-report-panel"><header><div><h2>{titulo}</h2><p>Concepto, categoría, fecha e importe de cada gasto del periodo.</p></div></header>
    {categorias.error&&<p role="alert">{categorias.error} <button type="button" onClick={categorias.reintentar}>Reintentar categorías</button></p>}
    {error && <p role="alert">{error} <button type="button" onClick={reintentar}>Reintentar gastos</button></p>}
    {pendiente && <p role="status" className="vz-report-nota">Consultando gastos…</p>}
    <div className="vz-report-gastos" aria-busy={pendiente}>{datos?.gastos.length ? datos.gastos.map(g => <article key={g.id}><div><strong>{g.descripcion}</strong><p>{CLASES_REPORTE[g.clasificacion]} · {categorias.datos?.find(c => c.id === g.categoria_id)?.nombre ?? 'Categoría no disponible'}</p><p>{g.fecha_gasto} · Gasto #{g.id} · {g.movimiento_caja_id ? `Movimiento #${g.movimiento_caja_id}` : 'Sin movimiento de caja vinculado'}</p>{g.comprobante_fiscal&&<p>Comprobante: {g.comprobante_fiscal}</p>}</div><strong>{monedaReporte(g.monto_gasto)}</strong></article>) : !pendiente && !error && <p className="vz-report-vacio">No hay gastos registrados con estos filtros.</p>}</div>
    {datos&&<p className="vz-report-nota">{datos.gastos.length} gastos en esta página · Total de esta página: <strong>{monedaReporte(totalTexto)}</strong>. El PDF incluye esta página del detalle. Los totales del estado de resultados consideran todo el periodo.</p>}
    <footer className="vz-report-paginacion"><span>Página {cursores.length}</span><BotonBase disabled={pendiente || cursores.length <= 1} onClick={() => setCursores(c => c.slice(0, -1))}>Anterior</BotonBase><BotonBase disabled={pendiente || Boolean(error) || !datos?.paginacion.siguiente} onClick={() => setCursores(c => [...c, datos.paginacion.siguiente])}>Siguiente</BotonBase></footer>
  </section>
}
