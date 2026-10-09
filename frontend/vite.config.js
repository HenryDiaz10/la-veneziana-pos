// Importamos la función que ayuda a definir la configuración de Vite.
import { defineConfig } from 'vite'

// Importamos el plugin que integra React con Vite.
import react from '@vitejs/plugin-react'

// Exportamos la configuración que Vite utilizará al ejecutarse.
export default defineConfig({
  // Activamos el soporte para React y su actualización en desarrollo.
  plugins: [react()],

  // Configuramos el servidor de desarrollo del frontend.
  server: {
    // Escuchamos en la dirección local de esta computadora.
    host: 'localhost',

    // Usamos el puerto permitido por CORS en el backend.
    port: 5173,

    // Si el puerto está ocupado, mostramos un error.
    // Evitamos que Vite cambie automáticamente a otro puerto.
    strictPort: true,
  },
})