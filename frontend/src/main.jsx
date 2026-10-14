// Importamos StrictMode, que activa comprobaciones adicionales
// para detectar problemas durante el desarrollo.
import { StrictMode } from 'react'

// Importamos la función que conecta React con el contenido HTML.
import { createRoot } from 'react-dom/client'

// Cargamos los archivos locales y las reglas CSS de Inter.
// La fuente variable permite utilizar diferentes grosores.
import '@fontsource-variable/inter'

// Cargamos Montserrat para los títulos de la aplicación.
import '@fontsource-variable/montserrat'

// Cargamos los estilos generales de la aplicación.
import './index.css'

// Importamos el componente principal que creamos.
import App from './App.jsx'

// Buscamos el elemento con id="root" definido en index.html.
const elementoRaiz = document.getElementById('root')

// Creamos la raíz de React dentro de ese elemento.
const raiz = createRoot(elementoRaiz)

// Cargar y validar la configuración antes de mostrar la aplicación.
// import() devuelve una promesa: puede completarse o fallar.
import('./config/env.js')
  .then(() => {
    // La configuración es válida: mostrar la pantalla habitual.
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
  .catch(() => {
    // La configuración falló: mostrar un mensaje comprensible.
    // No mostramos valores ni detalles internos del error.
    raiz.render(
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <section
          role="alert"
          className="rounded-xl border border-borde bg-superficie p-6"
        >
          <h1 className="font-titulo text-2xl font-bold">
            Sistema no disponible
          </h1>
          <p className="mt-4 text-texto-secundario">
            La configuración de conexión no es válida.
            Contacta al responsable del sistema.
          </p>
        </section>
      </main>
    )
  })