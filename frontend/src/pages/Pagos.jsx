import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useConsultaRemota from '../hooks/useConsultaRemota.js'
import { consultarContextoPago } from '../services/pagos.service.js'
import { METODOS_PAGO } from '../utils/pagos-mixtos.js'
import ModalPagosMixtos from '../components/pos/ModalPagosMixtos.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Icono from '../components/ui/Icono.jsx'

const idValido = id => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n
export default function Pagos() {
  const [parametros] = useSearchParams()
  const inicial = parametros.getAll('pedido').length === 1 && idValido(parametros.get('pedido')) ? parametros.get('pedido') : ''
  const [numero, setNumero] = useState(inicial)
  const [solicitud, setSolicitud] = useState(() => inicial ? { id: inicial } : null)
  const [errorEntrada, setErrorEntrada] = useState('')
  const [modal, setModal] = useState(false)
  const [preparada, setPreparada] = useState(null)
  const campoId = useId()
  const { datos, error, pendiente, reintentar } = useConsultaRemota(consultarContextoPago, solicitud, { conservarDatos: true, claveDatos: solicitud?.id })
  function buscar(e) {
    e.preventDefault()
    const id = numero.trim()
    if (!idValido(id)) { setErrorEntrada('Indica el número interno del pedido, solo dígitos y mayor que cero.'); return }
    setErrorEntrada(''); setModal(false); setPreparada(null); setSolicitud({ id })
  }
  const pedido = datos?.pedido
  const disponible = pedido && pedido.total !== '0.00' && ['abierta', 'bloqueada_en_pago'].includes(pedido.estado_cuenta)
  const otraPersona = pedido?.estado_cuenta === 'bloqueada_en_pago' && !pedido.bloqueo_propio && !pedido.bloqueo_vencido
  const reparto = preparada?.datos === datos ? preparada.comando : null
  return <section className="vz-page" aria-labelledby="titulo-pagos">
    <div className="vz-page-header"><div><p className="vz-kicker"><Icono nombre="billete"/>La Veneziana · Atención de caja</p><h1 id="titulo-pagos" className="vz-page-title">Pagos de pedidos</h1><p className="vz-page-description">Consulta un pedido registrado y prepara cómo se repartirá su pago.</p></div></div>
    <form onSubmit={buscar} className="vz-panel mb-6"><label htmlFor={campoId} className="mb-2 block text-sm font-semibold">Número interno del pedido</label><div className="flex flex-wrap gap-3"><input id={campoId} value={numero} onChange={e => setNumero(e.target.value)} inputMode="numeric" maxLength={19} autoComplete="off" className="vz-purchase-input min-w-0 flex-1" aria-invalid={Boolean(errorEntrada)} aria-describedby={errorEntrada ? `${campoId}-error` : undefined}/><BotonSecundario type="submit" disabled={pendiente}><Icono nombre="buscar"/>Consultar pedido</BotonSecundario></div>{errorEntrada && <p id={`${campoId}-error`} role="alert" className="mt-3 text-sm text-app-error">{errorEntrada}</p>}</form>
    {pendiente && <p role="status" className={datos ? 'sr-only' : 'vz-panel text-sm'}>Consultando pedido y sesión de caja…</p>}
    {error && <div role="alert" className="vz-panel space-y-3"><p className="text-sm text-app-error">{error}</p><BotonBase className="border border-app-borde" onClick={reintentar}>Reintentar consulta</BotonBase></div>}
    {!solicitud && <div className="vz-client-welcome"><span className="vz-empty-icon"><Icono nombre="billete"/></span><h2 className="font-titulo text-xl font-bold">Cada pago, en su medio</h2><p className="mt-3 text-sm text-app-secundario">Trabaja con el total oficial del pedido. El borrador del carrito debe registrarse antes de preparar un cobro.</p></div>}
    {pedido && !error && <div className="space-y-5" aria-busy={pendiente}>
      <div className="vz-panel space-y-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="vz-kicker">Pedido registrado</p><h2 className="font-titulo text-xl font-bold">{pedido.codigo_pedido}</h2><p className="mt-2 text-sm text-app-secundario">Cuenta {pedido.estado_cuenta === 'bloqueada_en_pago' ? 'en proceso de pago' : pedido.estado_cuenta}</p></div><div className="text-right"><p className="text-xs text-app-secundario">Total oficial</p><p className="break-all font-mono text-3xl font-bold text-app-acento-texto">S/ {pedido.total}</p></div></div>
        <p className="text-sm">{datos.sesion_caja ? `Sesión de caja: ${datos.sesion_caja.nombre_caja}` : 'No tienes una sesión de caja abierta.'}</p>
        {!disponible && <p role="alert" className="text-sm text-app-error">{pedido.total === '0.00' ? 'El pedido no tiene un importe pendiente para distribuir.' : `La cuenta está ${pedido.estado_cuenta}; no se puede preparar otro pago.`}</p>}
        {otraPersona && <p role="alert" className="text-sm text-app-error">Otro cajero mantiene el bloqueo de pago.</p>}
        <div className="flex flex-wrap gap-3"><BotonSecundario disabled={pendiente || !disponible || otraPersona} onClick={() => setModal(true)}><Icono nombre="billete"/>Distribuir pago</BotonSecundario><BotonBase className="border border-app-borde" disabled={pendiente || modal} onClick={() => { setPreparada(null); reintentar() }}><Icono nombre="actualizar"/>Actualizar pedido</BotonBase></div>
      </div>
      {reparto && <div className="vz-panel space-y-4" role="region" aria-label="Distribución preparada"><h2 className="font-titulo text-lg font-bold">Distribución preparada</h2><ul className="space-y-3">{reparto.pagos.map(p => <li key={p.metodo_pago} className="break-words rounded-xl border border-app-borde p-3"><p className="font-bold">{METODOS_PAGO.find(m => m.clave === p.metodo_pago).nombre}: S/ {p.monto_pagado}</p>{p.referencia_operacion && <p className="mt-2 text-sm">Referencia: {p.referencia_operacion}</p>}{p.monto_entregado && <p className="mt-2 text-sm">Efectivo recibido: S/ {p.monto_entregado}</p>}</li>)}</ul><p className="font-bold">Vuelto en efectivo: S/ {preparada.vuelto}</p><p className="text-sm text-app-secundario">No se ha cobrado el pedido. La confirmación definitiva se incorporará en la siguiente fase.</p><div className="flex flex-wrap gap-3"><BotonBase className="border border-app-borde" onClick={() => setModal(true)}>Editar distribución</BotonBase><BotonBase className="border border-app-borde" onClick={() => setPreparada(null)}>Descartar distribución preparada</BotonBase></div></div>}
      <p className="text-xs text-app-secundario">Esta pantalla prepara la distribución; no registra pagos ni limpia el carrito.</p>
    </div>}
    {modal && datos && <ModalPagosMixtos contexto={datos} inicial={reparto?.pagos} onPreparar={(comando, vuelto) => setPreparada({ datos, comando, vuelto })} onCerrar={() => setModal(false)}/>}
  </section>
}
