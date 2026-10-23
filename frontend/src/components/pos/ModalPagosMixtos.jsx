import { useId, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Icono from '../ui/Icono.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import { aCentimos, desdeCentimos } from '../../utils/carrito-calculo.js'
import { METODOS_PAGO, evaluarPagosMixtos, importeEntrada, prepararComandoPago } from '../../utils/pagos-mixtos.js'

// Componente de captura: entrega un comando validado al padre sin enviarlo.
// Los datos y referencias permanecen en memoria y no se guardan en localStorage.
export default function ModalPagosMixtos({ contexto, inicial = null, onPreparar, onCerrar }) {
  const id = useId()
  const [filas, setFilas] = useState(() => inicial?.map(p => ({ metodo: p.metodo_pago, aplicado: p.monto_pagado,
    entregado: p.monto_entregado ?? '', referencia: p.referencia_operacion ?? '', verificado: p.verificado ?? false,
    puntos: p.puntos === undefined ? '' : String(p.puntos) })) ?? [{ metodo: 'efectivo', aplicado: contexto.pedido.total, entregado: '' }])
  const [sucio, setSucio] = useState(false)
  const [salida, setSalida] = useState(false)
  const [error, setError] = useState('')
  const [tocados, setTocados] = useState({})
  const evaluacion = evaluarPagosMixtos(contexto.pedido.total, filas, contexto.canje)
  const medios = METODOS_PAGO.filter(m => m.clave !== 'puntos_vip' || contexto.canje.disponible)
  const ocupada = contexto.pedido.estado_cuenta === 'bloqueada_en_pago' && !contexto.pedido.bloqueo_propio && !contexto.pedido.bloqueo_vencido
  const apto = Boolean(contexto.sesion_caja) && ['abierta', 'bloqueada_en_pago'].includes(contexto.pedido.estado_cuenta) && !ocupada
  function cambiar(metodo, campo, valor) {
    setSucio(true); setError('')
    setFilas(actual => actual.map(f => f.metodo === metodo ? { ...f, [campo]: valor,
      ...(['aplicado', 'referencia'].includes(campo) ? { verificado: false } : {}) } : f))
  }
  function alternar(metodo) {
    setSucio(true); setError('')
    setFilas(actual => actual.some(f => f.metodo === metodo) ? actual.filter(f => f.metodo !== metodo) :
      [...actual, { metodo, aplicado: '', entregado: '', referencia: '', verificado: false, puntos: '' }])
  }
  function completar(fila) {
    try {
      const resto = filas.filter(f => f.metodo !== fila.metodo).reduce((s, f) => {
        if (f.metodo !== 'puntos_vip') return s + importeEntrada(f.aplicado || '0')
        if (!/^\d{1,10}$/.test(f.puntos || '0')) throw new Error('Revisa los puntos antes de completar el saldo.')
        return s + BigInt(f.puntos || '0') * aCentimos(contexto.canje.valor_punto_pen)
      }, 0n)
      const falta = aCentimos(contexto.pedido.total) - resto
      if (falta <= 0n) { setError('Los otros medios ya cubren el total. Ajusta sus importes primero.'); return }
      cambiar(fila.metodo, 'aplicado', desdeCentimos(falta))
    } catch { setError('Revisa los importes de los otros medios antes de completar el saldo.') }
  }
  function preparar(evento) {
    evento.preventDefault()
    try { onPreparar(prepararComandoPago(contexto, filas), evaluacion.vuelto); onCerrar('preparado') }
    catch (e) { setError(e.message) }
  }
  const solicitarCierre = () => sucio ? setSalida(true) : onCerrar()
  return <Modal titulo="Distribuir pago" descripcion={`Pedido ${contexto.pedido.codigo_pedido}. Total oficial: S/ ${contexto.pedido.total}.`} onCerrar={solicitarCierre}>
    {salida ? <div className="space-y-5"><p className="font-semibold">¿Descartar esta distribución?</p><p className="text-sm text-app-secundario">Los importes y referencias capturados se perderán. El pedido seguirá sin cobrarse.</p><div className="flex flex-wrap justify-end gap-3"><BotonBase className="border border-app-borde" onClick={() => setSalida(false)}>Seguir editando</BotonBase><BotonSecundario onClick={onCerrar}>Descartar distribución</BotonSecundario></div></div> :
      <form onSubmit={preparar} noValidate className="vz-payment-form space-y-5">
        <div className="vz-payment-total"><span>Total del pedido</span><strong>S/ {contexto.pedido.total}</strong></div>
        <fieldset><legend className="mb-3 text-sm font-bold">Elige los medios de pago</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {medios.map(m => <button key={m.clave} type="button" aria-pressed={filas.some(f => f.metodo === m.clave)} onClick={() => alternar(m.clave)} className="vz-payment-method" data-metodo={m.clave}>
            <Icono nombre={m.icono}/><span>{m.nombre}</span>
          </button>)}
        </div></fieldset>
        {filas.length === 0 && <p className="text-sm text-app-secundario">Selecciona al menos un medio para distribuir el total.</p>}
        {filas.map(f => {
          const medio = METODOS_PAGO.find(m => m.clave === f.metodo), errores = evaluacion.errores[f.metodo]
          const campoId = campo => `${id}-${f.metodo}-${campo}`
          const verError = campo => tocados[campoId(campo)] && errores[campo]
          const input = (campo, etiqueta, extra = {}) => <div className="min-w-0"><label htmlFor={campoId(campo)} className="mb-2 block text-xs font-semibold">{etiqueta}</label><input id={campoId(campo)} value={f[campo] ?? ''} onChange={e => cambiar(f.metodo, campo, e.target.value)} onBlur={() => setTocados(t => ({ ...t, [campoId(campo)]: true }))}
            aria-invalid={Boolean(verError(campo))} aria-describedby={verError(campo) ? `${campoId(campo)}-error` : undefined}
            type="text" inputMode={campo === 'referencia' ? 'text' : 'decimal'} maxLength={campo === 'referencia' ? 100 : 13} autoComplete="off" className="vz-purchase-input" {...extra}/>
            {verError(campo) && <p id={`${campoId(campo)}-error`} className="mt-2 text-xs text-app-error">{errores[campo]}</p>}</div>
          return <fieldset key={f.metodo} className="vz-payment-card" aria-label={`Pago por ${medio.nombre}`}>
            <legend className="flex items-center gap-2 px-1 text-sm font-bold"><Icono nombre={medio.icono}/>{medio.nombre}</legend>
            <div className="mb-4 flex justify-end"><button type="button" onClick={() => alternar(f.metodo)} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-app-error" aria-label={`Quitar ${medio.nombre}`}>Quitar medio</button></div>
            {f.metodo === 'puntos_vip' ? <div className="space-y-3">{input('puntos', 'Puntos a canjear', { inputMode: 'numeric', maxLength: 10 })}
              <p className="text-xs text-app-secundario">Saldo: {contexto.canje.saldo_puntos} puntos · Cada punto: S/ {contexto.canje.valor_punto_pen}</p>
              <p className="font-bold">Importe del canje: S/ {evaluacion.pagos.find(p => p.metodo_pago === 'puntos_vip')?.monto_pagado ?? '0.00'}</p></div> :
              <div className="space-y-3">{input('aplicado', 'Importe aplicado (S/)')}<button type="button" onClick={() => completar(f)} className="min-h-11 rounded-lg border border-app-borde px-3 text-xs font-semibold">Completar saldo con {medio.nombre}</button></div>}
            {f.metodo === 'efectivo' ? <div className="mt-4 space-y-3">
              {input('entregado', 'Efectivo recibido (S/)')}
              <button type="button" onClick={() => cambiar(f.metodo, 'entregado', f.aplicado)} className="min-h-11 rounded-lg border border-app-borde px-3 text-xs font-semibold">Recibido exacto</button>
              <p className="rounded-lg bg-app-elevada p-3 text-sm font-semibold">Vuelto en efectivo: S/ {evaluacion.vuelto}</p>
            </div> : f.metodo !== 'puntos_vip' && <div className="mt-4 space-y-3">
              {input('referencia', 'Referencia de operación')}
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-app-borde p-3 text-sm"><input type="checkbox" checked={f.verificado ?? false} onChange={e => cambiar(f.metodo, 'verificado', e.target.checked)} className="mt-1 size-4 shrink-0 accent-marca-dorado"/><span>Verifiqué el pago por {medio.nombre}</span></label>
              <p className="text-xs text-app-secundario">Confirma el abono o comprobante. No ingreses números de tarjeta ni códigos de seguridad.</p>
            </div>}
          </fieldset>
        })}
        <div className="vz-payment-summary" role="status" aria-live="polite">
          <div><span>Importe aplicado</span><strong>S/ {evaluacion.aplicado}</strong></div>
          <div><span>Falta distribuir</span><strong>S/ {evaluacion.faltante}</strong></div>
          <div className={evaluacion.exceso !== '0.00' ? 'text-app-error' : ''}><span>Exceso aplicado</span><strong>S/ {evaluacion.exceso}</strong></div>
          <div><span>Vuelto en efectivo</span><strong>S/ {evaluacion.vuelto}</strong></div>
        </div>
        {!contexto.sesion_caja && <p className="vz-panel text-sm text-app-error">Necesitas una sesión de caja abierta a tu nombre para preparar el pago.</p>}
        {!contexto.finanzas_habilitadas && <p className="text-sm text-app-secundario">La configuración financiera debe validarse antes del cobro definitivo.</p>}
        {ocupada && <p role="alert" className="text-sm text-app-error">Otro cajero está atendiendo el cobro de este pedido.</p>}
        {error && <p role="alert" className="text-sm text-app-error">{error}</p>}
        <p className="text-xs text-app-secundario">Preparar la distribución no registra ni confirma un cobro.</p>
        <div className="flex flex-wrap justify-end gap-3 border-t border-app-borde pt-4"><BotonBase className="border border-app-borde" onClick={solicitarCierre}>Cancelar</BotonBase><BotonSecundario type="submit" disabled={!evaluacion.valido || !apto}>Preparar distribución</BotonSecundario></div>
      </form>}
  </Modal>
}
