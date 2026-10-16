import { Link } from 'react-router-dom'
import logo from '../assets/logo-veneziana.png'
import SelectorTema from './SelectorTema.jsx'
import BotonBase from './ui/BotonBase.jsx'
import Icono from './ui/Icono.jsx'

function AppHeader({ usuario, operacion, salir, titulo, onMenu, menuAbierto, referenciaMenu }) {
  const iniciales = usuario.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('')
  return (
    <header className="vz-topbar">
      <Link to="/inicio" className="vz-brand">
        <img src={logo} alt=""/>
        <span><strong>La Veneziana</strong><small>Pizzería · Gestión</small></span>
      </Link>
      <div className="vz-topbar-content">
        {onMenu && (
          <BotonBase ref={referenciaMenu} onClick={onMenu} aria-expanded={menuAbierto}
            aria-controls="menu-administracion" aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            className="vz-header-button lg:hidden">
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'}/><span className="text-xs">Menú</span>
          </BotonBase>
        )}
        <div className="vz-topbar-context">
          <p className="vz-topbar-label">Gestión de la pizzería</p>
          <p className="vz-topbar-title">{titulo}</p>
        </div>
        <div className="vz-header-actions">
          <div className="vz-user" aria-label={`${usuario.nombre}, ${usuario.rol.nombre}`} title={`${usuario.nombre} · ${usuario.rol.nombre}`}>
            <span className="vz-avatar" aria-hidden="true">{iniciales}</span>
            <div><p title={usuario.nombre} className="vz-user-name">{usuario.nombre}</p><p className="vz-user-role">{usuario.rol.nombre}</p></div>
          </div>
          <SelectorTema className="vz-header-button"/>
          <BotonBase aria-label="Cerrar sesión" title="Cerrar sesión" cargando={operacion === 'logout'}
            textoCargando="Cerrando…" onClick={() => void salir()} className="vz-header-button">
            <Icono nombre="salir"/><span className="hidden xl:inline">Salir</span>
          </BotonBase>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
