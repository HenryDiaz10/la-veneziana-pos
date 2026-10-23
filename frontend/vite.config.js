import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,

    // Reenviar las solicitudes de la API al backend local.
    // El navegador utiliza localhost:5173 para página y cookies.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        // Compartir /api también con el canal autenticado de avisos KDS.
        ws: true,
        changeOrigin: true
      }
    }
  }
})
