import { accionesKds, destinoKds, NOMBRES_KDS, etiquetaAccionKds } from '../../utils/kds-tablero.js'
import TiempoKds from './TiempoKds.jsx'

export default function TarjetaKds({ tarea: t, bloqueado, onAccion, ahora, umbrales, sincronizado }) {
  return <article className="vz-kds-ticket" aria-label={`${t.nombre}, tarea ${t.id}`}>
    <div className="vz-kds-ticket-top"><strong>{t.pedido.codigo}</strong><span>{t.canal === 'cocina' ? 'Cocina' : 'Despacho'}</span></div>
    <p className="vz-kds-destino">{destinoKds(t)}</p>
    <h3><span className="vz-kds-cantidad">{t.cantidad}×</span> {t.nombre}</h3>
    {t.variante && <p className="text-app-secundario">{t.variante}</p>}
    <p className="vz-kds-referencia">Tarea #{t.id} · Componente {t.componente_numero} · v{t.version}</p>
    {t.modificadores.length > 0 && <ul className="vz-kds-opciones">{t.modificadores.map((m, i) => <li key={`${m.id}-${i}`} className={m.es_exclusion ? 'es-exclusion' : ''}><strong>{m.es_exclusion ? 'Exclusión' : m.grupo_nombre || 'Opción'}:</strong> {m.nombre}</li>)}</ul>}
    {t.indicaciones && <p className="vz-kds-nota"><strong>Indicación para cocina</strong><br/>{t.indicaciones}</p>}
    <p className="vz-kds-fecha">Recibido <time dateTime={t.enviado_en}>{new Date(t.enviado_en).toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</time></p>
    {t.horno_en && <p className="vz-kds-fecha">Horno: <time dateTime={t.horno_en}>{new Date(t.horno_en).toLocaleTimeString('es-PE')}</time></p>}
    <TiempoKds tarea={t} ahora={ahora} umbrales={umbrales} sincronizado={sincronizado}/>
    <p className="sr-only">Estado: {NOMBRES_KDS[t.estado]}</p>
    <div className="vz-kds-acciones">{accionesKds(t).map(estado => <button type="button" key={estado} disabled={bloqueado} className={estado === 'cancelado' ? 'es-cancelar' : ''} onClick={() => onAccion(t, estado)}>{etiquetaAccionKds(estado)}</button>)}</div>
  </article>
}
