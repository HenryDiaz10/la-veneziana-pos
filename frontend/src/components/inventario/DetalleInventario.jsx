import { useMemo, useState } from 'react'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarDetalleInventario } from '../../services/inventario.service.js'
import Modal from '../ui/Modal.jsx'
import Badge from '../ui/Badge.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import Icono from '../ui/Icono.jsx'
import DataTable from '../ui/DataTable.jsx'
import PaginacionClientes from '../clientes/PaginacionClientes.jsx'
import { ALERTAS, TIPOS, cantidad, fecha } from './presentacion.js'

const columnas = [
  { clave: 'fecha_movimiento', titulo: 'Fecha', renderizar: m => <span className="whitespace-nowrap text-xs">{fecha(m.fecha_movimiento)}</span> },
  { clave: 'tipo_transaccion', titulo: 'Movimiento', renderizar: m => <div className="min-w-36"><p className="font-semibold">{TIPOS[m.tipo_transaccion] ?? m.tipo_transaccion}</p><p className="mt-1 break-all text-xs text-app-secundario">{m.referencia_documento || 'Sin referencia'}</p><p className="mt-1 text-xs text-app-secundario">Usuario #{m.usuario_id}</p>{m.notas && <p className="mt-1 text-xs text-app-secundario">{m.notas}</p>}</div> },
  { clave: 'cantidad', titulo: 'Cantidad', numerica: true, alineacion: 'derecha', renderizar: m => <span className={m.tipo_transaccion.startsWith('INGRESO') ? 'text-[var(--app-exito-texto)]' : 'text-app-error'}>{m.tipo_transaccion.startsWith('INGRESO') ? '+' : '-'}{cantidad(m.cantidad)}</span> },
  { clave: 'saldo_posterior', titulo: 'Físico posterior', numerica: true, alineacion: 'derecha', renderizar: m => cantidad(m.saldo_posterior) },
  { clave: 'costo_unitario_transaccion', titulo: 'Costo unitario (S/)', numerica: true, alineacion: 'derecha', renderizar: m => m.costo_unitario_transaccion === null ? 'Sin costo' : cantidad(m.costo_unitario_transaccion) }
]
function Valor({ titulo, valor, unidad }) {
  return <div className="rounded-xl border border-app-borde bg-app-fondo p-4"><dt className="text-xs text-app-secundario">{titulo}</dt><dd className="mt-2 break-all text-lg font-bold tabular-nums">{cantidad(valor)} <span className="text-xs font-normal">{unidad}</span></dd></div>
}
export default function DetalleInventario({ seleccion, onCerrar }) {
  const [pagina, setPagina] = useState(1)
  const [revision, setRevision] = useState(0)
  const solicitud = useMemo(() => ({ ...seleccion, pagina, revision }), [seleccion, pagina, revision])
  const { datos, pendiente, error } = useConsultaRemota(consultarDetalleInventario, solicitud)
  const i = datos?.insumo, c = datos?.conciliacion, alerta = ALERTAS[i?.alerta]
  return <Modal titulo={i?.nombre ?? 'Detalle de inventario'} descripcion="Saldos y movimientos en la unidad base de almacén." onCerrar={onCerrar}>
    {pendiente ? <p role="status" className="text-sm text-app-secundario">Consultando saldos e historial…</p> : error ? <div role="alert"><p className="mb-4 text-sm text-app-error">{error}</p><BotonBase onClick={() => setRevision(r => r + 1)} className="border border-app-borde">Reintentar detalle</BotonBase></div> : datos && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variante={alerta?.variante}>{alerta?.texto}</Badge>{!i.activo && i.alerta !== 'inactivo' && <Badge>Inactivo</Badge>}<span className="text-xs text-app-secundario">{i.codigo || 'Sin código'} · {i.unidad}</span></div><BotonBase onClick={() => setRevision(r => r + 1)} aria-label="Actualizar detalle de inventario" className="border border-app-borde"><Icono nombre="actualizar"/></BotonBase></div>
      {datos.producto && <p className="mb-4 rounded-xl bg-app-hover p-4 text-sm"><strong>{datos.producto.nombre}</strong> comparte estos saldos con su insumo vinculado.</p>}
      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2"><Valor titulo="Stock físico" valor={i.stock_fisico} unidad={i.unidad}/><Valor titulo="Reservado" valor={i.stock_reservado} unidad={i.unidad}/><Valor titulo="Disponible" valor={i.disponible} unidad={i.unidad}/><Valor titulo="Mínimo de alerta" valor={i.stock_minimo_alerta} unidad={i.unidad}/></dl>
      <section aria-labelledby="titulo-conciliacion" className="mb-6 rounded-2xl border border-app-borde p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 id="titulo-conciliacion" className="font-titulo font-bold">Conciliación</h3><Badge variante={c.coincide ? 'exito' : 'peligro'}>{c.coincide ? 'Saldos coinciden' : 'Diferencias detectadas'}</Badge></div>
        <dl className="space-y-3 text-sm">{[
          ['Entradas registradas', c.entradas], ['Salidas registradas', c.salidas],
          ['Físico según movimientos', c.fisico_segun_movimientos], ['Reservas activas', c.reservas_activas],
          ['Diferencia de físico', c.diferencia_fisico], ['Diferencia de reservado', c.diferencia_reservado]
        ].map(([titulo, valor]) => <div key={titulo} className="flex flex-wrap justify-between gap-2 border-b border-app-borde pb-2"><dt className="text-app-secundario">{titulo}</dt><dd className="font-semibold tabular-nums">{cantidad(valor)} {i.unidad}</dd></div>)}</dl>
        <p className="mt-3 text-xs leading-relaxed text-app-secundario">{c.ultimo_saldo_kardex === null ? 'Todavía no hay movimientos de Kardex.' : `Último físico registrado: ${cantidad(c.ultimo_saldo_kardex)} ${i.unidad}. Diferencia con saldo oficial: ${cantidad(c.diferencia_ultimo_saldo)} ${i.unidad}.`}</p>
        <p className="mt-3 text-xs leading-relaxed text-app-secundario">{c.supuesto} Las diferencias se informan para revisión; esta consulta no modifica saldos.</p>
      </section>
      {i.productos_directos > 0 && <section className="mb-6"><h3 className="font-titulo font-bold">Productos directos vinculados</h3><ul className="mt-3 space-y-2 text-sm text-app-secundario">{datos.productos_directos.map(p => <li key={p.id} className="break-words">{p.nombre}{p.sku ? ` · ${p.sku}` : ''}</li>)}</ul><p className="mt-2 text-xs text-app-secundario">Mostrando {datos.productos_directos.length} de {i.productos_directos}. Comparten el saldo del insumo.</p></section>}
      <DataTable titulo={`Historial de movimientos · ${i.unidad}`} columnas={columnas} filas={datos.movimientos} mensajeVacio="Este insumo todavía no tiene movimientos registrados."/>
      <PaginacionClientes nombre="Páginas del historial de inventario" datos={datos.paginacion} pagina={pagina} pendiente={pendiente} onPagina={setPagina}/>
      <p className="mt-4 text-xs text-app-secundario">Consulta: {fecha(datos.consultado_en)}. Actualiza para ver cambios posteriores.</p>
    </>}
  </Modal>
}
