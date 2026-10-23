import { DENOMINACIONES, calcularConteo } from '../../utils/arqueo-calculo.js'

// Captura en memoria: actualizar el resumen no reconstruye estos campos.
export default function ConteoEfectivo({ valor, onCambiar, observaciones, onObservaciones, disabled, onRevisar }) {
  let total = null, error = ''
  try { total = calcularConteo(valor) } catch (e) { error = e.message }
  return <form className="vz-panel vz-cash-count space-y-5" onSubmit={e => { e.preventDefault(); onRevisar() }}>
    <div><p className="vz-kicker">Último paso del turno</p><h2 className="mt-2 font-titulo text-xl font-bold">Cuenta el efectivo</h2><p className="mt-2 text-sm text-app-secundario">Incluye billetes y monedas que permanecen físicamente en esta caja.</p></div>
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="sr-only">Forma de conteo</legend>
      <div className="vz-cash-tabs">{[['importe', 'Importe total'], ['denominaciones', 'Por denominaciones']].map(([modo, nombre]) => <button key={modo} type="button" aria-pressed={valor.modo === modo} onClick={() => onCambiar({ ...valor, modo })}>{nombre}</button>)}</div>
      {valor.modo === 'importe' ? <label className="block text-sm font-semibold">Efectivo contado (S/)<input className="vz-purchase-input mt-2 w-full text-xl" value={valor.importe} onChange={e => onCambiar({ ...valor, importe: e.target.value })} inputMode="decimal" autoComplete="off" maxLength={14} placeholder="0.00" aria-describedby="ayuda-conteo"/></label> : <>
        <div className="vz-denominations">{DENOMINACIONES.map(d => <label key={d.centimos}><span>{d.nombre}</span><input aria-label={`Cantidad de ${d.nombre}`} className="vz-purchase-input w-full" value={valor.cantidades[d.centimos] ?? ''} onChange={e => onCambiar({ ...valor, cantidades: { ...valor.cantidades, [d.centimos]: e.target.value } })} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="0"/></label>)}</div>
        <label className="block text-sm font-semibold">Otros importes contados (S/)<input className="vz-purchase-input mt-2 w-full" value={valor.otros} onChange={e => onCambiar({ ...valor, otros: e.target.value })} inputMode="decimal" autoComplete="off" maxLength={14} placeholder="Opcional"/></label>
      </>}
      <p id="ayuda-conteo" className="text-xs text-app-secundario">Si la caja está vacía, escribe 0 para confirmarlo. No incluyas pagos digitales.</p>
      <label className="block text-sm font-semibold">Observaciones del conteo<textarea className="vz-purchase-input mt-2 w-full" value={observaciones} onChange={e => onObservaciones(e.target.value)} rows={3} maxLength={500} placeholder="Incidencias o aclaraciones del turno"/></label>
    </fieldset>
    <div className="vz-cash-count-total" role="status"><span>Total contado</span><strong>{total === null ? 'Por completar' : `S/ ${total}`}</strong></div>
    {error && <p className="text-xs text-app-secundario">{error}</p>}
    <button type="submit" disabled={disabled || total === null} className="vz-button min-h-12 w-full bg-marca-dorado px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Revisar cierre</button>
    <p className="text-xs text-app-secundario">El cierre y su diferencia se registran al confirmar. Actualizar conserva este conteo en memoria.</p>
  </form>
}
