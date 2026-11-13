import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import { solicitarApi } from '../../services/api.js'
import { imprimirTicket } from '../../utils/ticket-impresion.js'
import { METODOS_PAGO } from '../../utils/pagos-mixtos.js'

// Consultar el snapshot congelado al cobrar: nunca recalcular con precios actuales.
// Este GET mantiene el alcance y permiso de impresión comprobados por el servidor.
export default function TicketVenta({ uid, onCerrar }) {
  const [trabajo, setTrabajo] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [ancho, setAncho] = useState(80)
  const [imprimiendo, setImprimiendo] = useState(false)
  const contenido = useRef(null)
  useEffect(() => {
    const control = new AbortController()
    solicitarApi(`/pedidos/impresion/${encodeURIComponent(uid)}`, { signal: control.signal })
      .then(r => {
        if (control.signal.aborted) return
        if (r.trabajo?.contenido?.documento !== 'ticket_interno' || !Array.isArray(r.trabajo.contenido.lineas) || !Array.isArray(r.trabajo.contenido.pagos)) throw new Error('El ticket no está disponible en un formato válido.')
        setTrabajo(r.trabajo)
      }).catch(e => { if (!control.signal.aborted) setError(e.message) })
    return () => control.abort()
  }, [uid, intento])
  async function imprimir() {
    if (imprimiendo) return
    setImprimiendo(true); setError('')
    try { await imprimirTicket(contenido.current, ancho) }
    catch (e) { setError(e.message) }
    finally { setImprimiendo(false) }
  }
  const t = trabajo?.contenido
  const fecha = t && new Date(t.fecha)
  return <Modal titulo="Ticket de venta" onCerrar={onCerrar} bloqueado={imprimiendo} descripcion="Imprime una copia del ticket interno o guárdala como PDF.">
    <div className="space-y-4">
      {!t && !error && <p role="status">Consultando ticket…</p>}
      {error && <div role="alert"><p className="text-app-error">{error}</p>{!t && <BotonBase onClick={() => { setError(''); setIntento(n => n + 1) }}>Reintentar ticket</BotonBase>}</div>}
      {t && <>
        <label className="block text-sm font-semibold">Ancho del papel<select className="vz-purchase-input mt-2 w-full" value={ancho} onChange={e => setAncho(Number(e.target.value))}><option value={80}>80 mm</option><option value={58}>58 mm</option></select></label>
        <div className="flex flex-wrap gap-3"><BotonSecundario disabled={imprimiendo} onClick={imprimir}>Imprimir ticket</BotonSecundario><BotonBase className="border border-app-borde" disabled={imprimiendo} onClick={imprimir}>Guardar PDF</BotonBase></div>
        <p className="text-xs text-app-secundario">Para PDF, elige «Guardar como PDF» en el diálogo del navegador. Para la ticketera, selecciona tu impresora y el mismo ancho, escala 100 %, sin encabezados ni pies. Abrir este diálogo no confirma una impresión física.</p>
        <div className="overflow-x-auto rounded-xl border border-app-borde bg-white p-3">
          <article ref={contenido} aria-label="Contenido del ticket" className="mx-auto font-mono text-xs text-black" style={{ width: `${ancho}mm`, maxWidth: '100%', overflowWrap: 'anywhere' }}>
            <header className="text-center"><h3 className="text-lg font-bold">{t.titulo}</h3><p>TICKET INTERNO · NO FISCAL</p><p>{t.codigo}</p><p>Pedido: {t.pedido}</p><p>{({ salon: 'En salón', llevar: 'Para llevar', delivery: 'Delivery' })[t.atencion] ?? t.atencion}</p><p>{fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleString('es-PE', { timeZone: 'America/Lima' }) : t.fecha}</p></header>
            <section className="mt-3 border-t border-dashed border-gray-400 pt-3">
              {t.lineas.map((l, i) => <div key={i} className="ticket-linea mb-3"><div className="ticket-fila flex justify-between gap-2"><strong className="ticket-texto">{l.cantidad} × {l.nombre}</strong><span className="whitespace-nowrap">S/ {l.total}</span></div>{l.variante && <p>{l.variante}</p>}{l.modificadores?.length > 0 && <ul>{l.modificadores.map((m, j) => <li key={j}>{m}</li>)}</ul>}{l.indicaciones && <p>Nota: {l.indicaciones}</p>}</div>)}
            </section>
            <section className="mt-3 border-t border-dashed border-gray-400 pt-3"><p className="ticket-fila flex justify-between gap-2"><span>Base gravada</span><span>S/ {t.subtotal}</span></p><p className="ticket-fila flex justify-between gap-2"><span>IGV</span><span>S/ {t.impuesto}</span></p><p className="ticket-fila ticket-total flex justify-between gap-2 font-bold"><span>TOTAL</span><span>S/ {t.total}</span></p></section>
            <section className="mt-3 border-t border-dashed border-gray-400 pt-3">{t.pagos.map((p, i) => <div key={i} className="mb-2"><p className="ticket-fila flex justify-between gap-2"><span>{METODOS_PAGO.find(m => m.clave === p.metodo)?.nombre ?? p.metodo}</span><span>S/ {p.importe}</span></p>{p.recibido && <><p>Recibido: S/ {p.recibido}</p><p>Vuelto: S/ {p.vuelto}</p></>}</div>)}</section>
            <footer className="mt-4 text-center"><p>Gracias por tu preferencia</p><p>Este ticket no sustituye una boleta o factura electrónica.</p></footer>
          </article>
        </div>
      </>}
    </div>
  </Modal>
}
