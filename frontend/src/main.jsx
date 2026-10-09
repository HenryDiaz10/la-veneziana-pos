// Importamos StrictMode, que activa comprobaciones adicionales
// para detectar problemas durante el desarrollo.
import { StrictMode } from 'react'

// Importamos la función que conecta React con el contenido HTML.
import { createRoot } from 'react-dom/client'

// Cargamos los estilos generales de la aplicación.
import './index.css'

// Importamos el componente principal que creamos.
import App from './App.jsx'

// Buscamos el elemento con id="root" definido en index.html.
const elementoRaiz = document.getElementById('root')

// Creamos la raíz de React dentro de ese elemento.
const raiz = createRoot(elementoRaiz)

// Mostramos el componente App.
// StrictMode agrega comprobaciones de desarrollo sin crear
// un elemento visible adicional en la página.
raiz.render(
  <StrictMode>
    <App />
  </StrictMode>
)