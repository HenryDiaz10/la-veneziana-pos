const DIBUJOS = {
  mesas: <><rect x="5" y="6" width="14" height="12" rx="3"/><path d="M8 3h2m4 0h2M8 21h2m4 0h2M2 9v2m0 2v2m20-6v2m0 2v2"/></>,
  billete: <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9h1m12 6h1"/></>,
  compras: <><path d="M6 3h12l3 5v13H3V8Zm-3 5h18M9 3v5m6-5v5M8 13h8m-8 4h5"/></>,
  inventario: <><path d="m3 7 9-4 9 4v13H3Zm0 0 9 4 9-4M12 11v9M8 5l9 4"/></>,
  historial: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/><path d="M12 7v6l4 2"/></>,
  alerta: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/></>,
  recetas: <><path d="M6 3h13v18H6a3 3 0 0 1 0-6h13M6 3a3 3 0 0 0-3 3v12"/><path d="M9 7h6m-6 4h4"/></>,
  ingrediente: <><path d="M12 21v-9M12 15C3 15 3 7 3 7s9-1 9 8ZM12 12C12 3 21 3 21 3s1 9-9 9Z"/></>,
  balanza: <><path d="M12 3v18M5 21h14M3 7h18M5 7l-3 7h6Zm14 0-3 7h6Z"/></>,
  guardar: <><path d="M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8"/></>,
  copiar: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
  clientes: <><circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6m3 3a6 6 0 0 1 3 5v2"/></>,
  ubicacion: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  premio: <><circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8"/></>,
  puntos: <><circle cx="12" cy="12" r="9"/><path d="m12 6 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9L8.4 17l.7-4-2.9-2.8 4-.6Z"/></>,
  documento: <><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17v-1a3 3 0 0 1 6 0v1m3-7h4m-4 4h4"/></>,
  telefono: <path d="M7 3H3c-1 9 9 19 18 18v-4l-5-2-2 2a15 15 0 0 1-7-7l2-2Z"/>,
  inicio: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
  catalogo: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  carrito: <><path d="M3 3h2l3 12h10l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  seguridad: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  componentes: <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  cerrar: <path d="m6 6 12 12M6 18 18 6"/>,
  salir: <path d="M10 4H5v16h5m5-12 4 4-4 4m-6-4h10"/>,
  buscar: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  mas: <path d="M12 5v14M5 12h14"/>,
  editar: <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>,
  eliminar: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>,
  estado: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  flecha: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  actualizar: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/></>,
  categorias: <><path d="M3 7h7l2-3h9v16H3Z"/><path d="M3 10h18"/></>,
  pizza: <><path d="M4 4c6-3 14 1 16 7L4 21Z"/><path d="M4 8c5-2 10 1 12 5"/><circle cx="8" cy="12" r="1"/><circle cx="7" cy="17" r=".8"/></>,
  usuario: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  lista: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>,
  sol: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  luna: <path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.5a8.5 8.5 0 1 0 10 10Z"/>
}

// Iconos decorativos propios, con un mismo trazo en todos los módulos.
function Icono({ nombre, className = '' }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    className={`size-5 shrink-0 ${className}`}>{DIBUJOS[nombre] ?? DIBUJOS.catalogo}</svg>
}
export default Icono
