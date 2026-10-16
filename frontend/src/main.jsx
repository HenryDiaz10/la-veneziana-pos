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

// Fuente local para el nombre de marca en la pantalla de login.
import '@fontsource-variable/playfair-display'

// Gestionar la navegación mediante la URL del navegador.
import { BrowserRouter } from 'react-router-dom'

// Buscamos el elemento con id="root" definido en index.html.
const elementoRaiz = document.getElementById('root')

// Creamos la raíz de React dentro de ese elemento.
const raiz = createRoot(elementoRaiz)

// Cargar la aplicación de forma diferida para capturar también
// los errores de configuración de sus servicios antes de mostrarla.
// El cliente API importa y valida env.js como parte de esta carga.
import('./App.jsx')
  .then(({ default: App }) => {
    // La aplicación y su configuración se cargaron correctamente.

    raiz.render(
      <StrictMode>
        {/* Habilitar la navegación para toda la aplicación. */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    )
  })
  .catch(() => {
    // Falló la configuración o la carga: mostrar un mensaje comprensible.
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
            No se pudo iniciar la aplicación.
            Contacta al responsable del sistema.
          </p>
        </section>
      </main>
    )
  })
