import { useRef, useState } from 'react'
import { useAuthStore } from '../stores/auth.store.js'
import useConsultaClientes from '../hooks/useConsultaClientes.js'
import { buscarClientes, filtroCliente } from '../services/clientes.service.js'
import Icono from '../components/ui/Icono.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import Badge from '../components/ui/Badge.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import FormularioDatosCliente from '../components/clientes/FormularioDatosCliente.jsx'
import PerfilCliente from '../components/clientes/PerfilCliente.jsx'
import PaginacionClientes from '../components/clientes/PaginacionClientes.jsx'

const nombreCompleto = c => [c.nombres, c.apellidos].filter(Boolean).join(' ')

export default function Clientes() {
  const usuario = useAuthStore(s => s.usuario)
  const gestionar = usuario?.permisos.some(p => p.modulo === 'clientes' && p.accion === 'gestionar') ?? false
  const [tipo, setTipo] = useState('documento')
  const [texto, setTexto] = useState('')
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [solicitud, setSolicitud] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [editor, setEditor] = useState(null)
  const [aviso, setAviso] = useState('')
  const [revisionPerfil, setRevisionPerfil] = useState(0)
  const buscador = useRef(null)
  const { datos, pendiente, error } = useConsultaClientes(buscarClientes, solicitud, { conservarDatos: true })

  function buscar(evento) {
    evento.preventDefault()
    const valor = tipo === 'documento' ? texto.trim().toUpperCase() : texto.trim()
    const valido = tipo === 'documento' ? /^[A-Z0-9]{5,20}$/.test(valor) : /^\+?\d{6,19}$/.test(valor)
    if (!valido) {
      setErrorBusqueda(tipo === 'documento' ? 'Escribe el documento completo: de 5 a 20 letras o números.' : 'Escribe el teléfono completo: de 6 a 19 dígitos, con + inicial opcional.')
      buscador.current?.focus()
      return
    }
    setErrorBusqueda(''); setAviso(''); setSeleccion(null)
    setSolicitud({ busqueda: { [tipo]: valor }, pagina: 1 })
  }

  function limpiar() {
    setTexto(''); setSolicitud(null); setSeleccion(null); setErrorBusqueda(''); setAviso('')
    buscador.current?.focus()
  }

  function guardado(cliente) {
    const busqueda = filtroCliente(cliente)
    setEditor(null); setAviso('Datos del cliente guardados correctamente.')
    setTipo(Object.keys(busqueda)[0]); setTexto(Object.values(busqueda)[0])
    setSolicitud({ busqueda, pagina: 1 }); setSeleccion({ id: cliente.id, busqueda })
    setRevisionPerfil(r => r + 1)
  }

  const columnas = [
    { clave: 'nombres', titulo: 'Cliente', renderizar: c => <div className="flex min-w-52 items-center gap-3"><span className="vz-client-avatar vz-client-avatar-small" aria-hidden="true"><Icono nombre="usuario"/></span><div><p className="font-semibold">{nombreCompleto(c)}</p><p className="mt-1 text-xs text-app-secundario">Ficha de atención</p></div></div> },
    { clave: 'numero_documento', titulo: 'Documento', renderizar: c => <div className="min-w-28"><p className="whitespace-nowrap">{c.numero_documento || 'No registrado'}</p><p className="mt-1 text-xs text-app-secundario">{c.tipo_documento || 'Sin tipo'}</p></div> },
    { clave: 'telefono_principal', titulo: 'Teléfono', renderizar: c => <span className="whitespace-nowrap">{c.telefono_principal || 'No registrado'}</span> },
    { clave: 'acciones', titulo: 'Acciones', renderizar: c => <div className="vz-row-actions">
      <BotonBase onClick={() => { setSeleccion({ id: c.id, busqueda: solicitud.busqueda }); setRevisionPerfil(r => r + 1); setAviso('') }} aria-label={`Ver perfil de ${nombreCompleto(c)}`} className="border border-app-borde"><Icono nombre="usuario"/>Ver perfil</BotonBase>
      {gestionar && <BotonBase onClick={() => setEditor({ registro: c })} aria-label={`Editar cliente ${nombreCompleto(c)}`} className="border border-app-borde"><Icono nombre="editar"/>Editar</BotonBase>}
    </div> }
  ]

  return <section className="vz-page" aria-labelledby="titulo-clientes">
    <div className="vz-page-header">
      <div><p className="vz-kicker"><Icono nombre="clientes"/>La Veneziana · Atención</p><h1 id="titulo-clientes" className="vz-page-title">Clientes</h1><p className="vz-page-description">Cada visita cuenta. Encuentra su ficha y cuida los detalles de su atención.</p></div>
      {gestionar ? <BotonSecundario onClick={() => setEditor({ registro: null })}><Icono nombre="mas"/>Nuevo cliente</BotonSecundario> : <Badge>Acceso de consulta</Badge>}
    </div>
    {aviso && <p role="status" className="vz-notice"><Icono nombre="estado"/>{aviso}</p>}
    <form onSubmit={buscar} className="vz-search" aria-label="Buscar clientes" noValidate>
      <div className="mb-5 flex items-center gap-3"><span className="vz-section-symbol"><Icono nombre="buscar"/></span><div><h2 className="font-titulo text-base font-bold">Encuentra a tu cliente</h2><p id="ayuda-busqueda-cliente" className="mt-1 text-xs text-app-secundario">Busca con el documento o teléfono completo. El listado aparece al consultar.</p></div></div>
      <div className="grid items-start gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <div><label htmlFor="tipo-busqueda-cliente" className="mb-2 block text-xs font-semibold">Buscar por</label><select id="tipo-busqueda-cliente" value={tipo} onChange={e => { setTipo(e.target.value); setTexto(''); setErrorBusqueda('') }} className="min-h-12 w-full rounded-lg border border-app-borde bg-app-fondo px-3 text-sm"><option value="documento">Documento</option><option value="telefono">Teléfono</option></select></div>
        <div><label htmlFor="busqueda-cliente" className="mb-2 block text-xs font-semibold">{tipo === 'documento' ? 'Número de documento' : 'Número de teléfono'}</label><div className="vz-search-field"><Icono nombre={tipo === 'documento' ? 'documento' : 'telefono'}/><input id="busqueda-cliente" ref={buscador} value={texto} onChange={e => { setTexto(e.target.value); setErrorBusqueda('') }} maxLength={20} autoComplete="off" type="text" inputMode={tipo === 'telefono' ? 'tel' : 'text'} placeholder={tipo === 'documento' ? 'Documento completo' : 'Teléfono completo, sin espacios'} aria-invalid={Boolean(errorBusqueda)} aria-describedby={`ayuda-busqueda-cliente${errorBusqueda ? ' error-busqueda-cliente' : ''}`}/></div></div>
        <div className="flex flex-wrap gap-2 md:pt-6"><BotonSecundario type="submit" cargando={pendiente} textoCargando="Buscando…"><Icono nombre="buscar"/>Buscar</BotonSecundario><BotonBase onClick={limpiar} className="border border-app-borde"><Icono nombre="cerrar"/>Limpiar</BotonBase></div>
      </div>
      {errorBusqueda && <p id="error-busqueda-cliente" role="alert" className="mt-3 text-xs text-app-error">{errorBusqueda}</p>}
    </form>
    {!solicitud ? <div className="vz-client-welcome">
      <div className="vz-client-welcome-art" aria-hidden="true"><Icono nombre="clientes"/></div>
      <p className="vz-kicker">Atención con nombre propio</p><h2 className="font-titulo text-xl font-bold">Todo empieza por conocer a tu cliente</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-app-secundario">Consulta sus datos de contacto, direcciones y nivel VIP desde una sola ficha.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Badge variante="advertencia">Datos de contacto</Badge><Badge variante="exito">Direcciones de entrega</Badge><Badge>Fidelización</Badge></div>
    </div> : <>
      <DataTable titulo="Resultados de la última búsqueda" columnas={columnas} filas={datos?.clientes ?? []} cargando={pendiente} error={error} alineacionVertical="centro" mensajeVacio="No encontramos clientes con ese dato exacto. Revisa el número o registra un nuevo cliente."/>
      {error && <BotonBase onClick={() => setSolicitud(s => ({ ...s }))} className="mt-3 border border-app-borde">Reintentar búsqueda</BotonBase>}
      <PaginacionClientes nombre="Paginación de clientes" datos={datos?.paginacion} pendiente={pendiente} pagina={solicitud.pagina} onPagina={pagina => { setSolicitud(s => ({ ...s, pagina })); setSeleccion(null) }}/>
    </>}
    {seleccion && <PerfilCliente key={revisionPerfil} seleccion={seleccion} gestionar={gestionar} onEditar={cliente => setEditor({ registro: cliente })} onAviso={setAviso} onCerrar={() => { setSeleccion(null); buscador.current?.focus() }}/ >}
    {editor && <FormularioDatosCliente key={editor.registro?.id ?? 'nuevo'} registro={editor.registro} onCerrar={() => setEditor(null)} onGuardado={guardado}/>}
  </section>
}
