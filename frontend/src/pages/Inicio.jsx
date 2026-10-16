import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store.js'
import Badge from '../components/ui/Badge.jsx'
import Icono from '../components/ui/Icono.jsx'
import TarjetaResumen from '../components/ui/TarjetaResumen.jsx'

function Inicio() {
  const usuario = useAuthStore(state => state.usuario)
  if (!usuario) return null
  const permite = (modulo, accion) => usuario.permisos.some(p => p.modulo === modulo && p.accion === accion)
  const accesos = []
  if (permite('catalogo', 'gestionar')) accesos.push({ ruta: '/recetas', titulo: 'Recetas', icono: 'recetas', tono: 'lima', descripcion: 'Define ingredientes, cantidades y rendimiento para cada plato y variante.' })
  if (permite('clientes', 'buscar')) accesos.push({ ruta: '/clientes', titulo: 'Clientes', icono: 'clientes', tono: 'dorado', descripcion: 'Consulta sus datos de contacto, direcciones y fidelización en una sola ficha.' })
  if (permite('catalogo', 'gestionar')) accesos.push({ ruta: '/catalogo', titulo: 'Catálogo', icono: 'catalogo', tono: 'dorado', descripcion: 'Organiza categorías, presenta tus productos y mantén sus precios al día.' })
  if (permite('ventas', 'cobrar')) accesos.push({ ruta: '/pos', titulo: 'Punto de venta', icono: 'carrito', tono: 'lima', descripcion: 'Accede al espacio de atención y venta de la pizzería.' })
  if (permite('seguridad', 'gestionar')) accesos.push({ ruta: '/seguridad', titulo: 'Seguridad', icono: 'seguridad', tono: 'rojo', descripcion: 'Consulta los perfiles del equipo y sus permisos de acceso.' })
  return (
    <section aria-labelledby="titulo-inicio" className="vz-page">
      <div className="vz-page-header">
        <div><p className="vz-kicker"><Icono nombre="inicio"/>Tu espacio de trabajo</p><h1 className="vz-page-title">Inicio</h1><p className="vz-page-description">Cada detalle cuenta. También en la gestión de tu pizzería.</p></div>
        <Badge variante="exito">Sesión activa</Badge>
      </div>
      <div className="vz-hero mb-6">
        <div className="relative z-10 max-w-2xl lg:pr-20">
          <p className="vz-kicker">BIENVENIDO A LA VENEZIANA</p>
          <h2 id="titulo-inicio" className="font-titulo text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Hola, {usuario.nombre.split(' ')[0]}.</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-app-secundario">Tu operación, en un solo lugar. Accede a las herramientas disponibles para tu perfil y continúa con tu jornada.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Badge>{usuario.rol.nombre}</Badge><Badge variante="advertencia">La Veneziana</Badge></div>
        </div>
        <div aria-hidden="true" className="vz-hero-art"><Icono nombre="pizza"/></div>
      </div>
      <div className="vz-stats">
        <TarjetaResumen titulo="Herramientas disponibles" valor={accesos.length} detalle="Accesos habilitados para tu perfil" icono="catalogo"/>
        <TarjetaResumen titulo="Tu perfil" valor={usuario.rol.nombre} detalle="Permisos asignados por administración" icono="usuario" tono="rojo"/>
        <TarjetaResumen titulo="Acceso" valor="Activo" detalle="Sesión de trabajo iniciada" icono="estado" tono="lima"/>
      </div>
      <div className="vz-section-head"><h2 className="vz-section-title">Accesos rápidos</h2><span className="text-xs text-app-secundario">Todo a un clic</span></div>
      <div className="vz-shortcuts">{accesos.map(acceso => (
        <Link key={acceso.ruta} to={acceso.ruta} className="vz-shortcut vz-stat" data-tono={acceso.tono}>
          <span className="vz-stat-icon"><Icono nombre={acceso.icono}/></span>
          <div><h3>{acceso.titulo}</h3><p className="mt-2">{acceso.descripcion}</p></div>
          <span className="vz-shortcut-action">Abrir {acceso.titulo.toLowerCase()}<Icono nombre="flecha"/></span>
        </Link>
      ))}</div>
      {accesos.length === 0 && <div className="vz-panel text-sm text-app-secundario">Tu cuenta no tiene accesos a estos módulos. Consulta con administración si necesitas uno.</div>}
    </section>
  )
}
export default Inicio
