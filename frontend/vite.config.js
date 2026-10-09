// Importamos la función para definir la configuración de Vite.
import { defineConfig } from 'vite'

// Importamos el plugin que integra React con Vite.
import react from '@vitejs/plugin-react'

// Importamos el plugin que genera los estilos de Tailwind.
import tailwindcss from '@tailwindcss/vite'

// Exportamos la configuración del proyecto.
export default defineConfig({
  // Activamos React y la integración de Tailwind.
  plugins: [react(), tailwindcss()],

  // Conservamos la configuración del servidor de desarrollo.
  server: {
    // Escuchamos únicamente en la dirección local.
    host: 'localhost',

    // Mantenemos el puerto permitido por CORS en el backend.
    port: 5173,

    // Mostramos un error si el puerto está ocupado.
    strictPort: true,
  },
})