# Frontend de La Veneziana

Interfaz web del sistema de la pizzería, construida con React y Vite.

## Estado actual

Las fases 3 y 4 preparan la interfaz inicial con React, Vite y Tailwind CSS.

La pantalla utiliza colores compartidos, Inter para texto, Montserrat
para títulos y un enlace de teclado para saltar al contenido principal.

Las pantallas de negocio y la conexión con el backend siguen pendientes.

## Instalación

Ejecutar desde la carpeta CODIGO/frontend:

```powershell
# Instalamos las versiones registradas en package-lock.json.
npm.cmd ci
```

## Desarrollo

```powershell
# Iniciamos el servidor de desarrollo.
npm.cmd run dev
```

Abrir http://localhost:5173.

El puerto está fijado en 5173. Si está ocupado, Vite muestra un error
en lugar de utilizar otro puerto.

Para detener el servidor, presionar Ctrl + C. Si Windows pregunta
si se desea terminar el trabajo por lotes, responder S.

## Verificación del código

```powershell
# Revisamos el código mediante ESLint.
npm.cmd run lint

# Generamos la versión de producción.
npm.cmd run build
```

El resultado de la compilación se guarda en dist.
Este comando no publica la aplicación en internet.

## Organización

- index.html: documento HTML, idioma, título y elemento raíz.
- src/main.jsx: inicia React e importa los estilos generales.
- src/App.jsx: componente principal de la aplicación.
- src/index.css: estilos básicos.
- vite.config.js: integración con React y servidor de desarrollo.
- eslint.config.js: reglas de revisión del código.

node_modules y dist están excluidos de Git.

## Estilos y fuentes

- src/theme.css: colores y familias tipográficas compartidos.
- src/index.css: Tailwind, estilos generales y foco visible.
- Inter y Montserrat: fuentes locales mediante Fontsource, con
  font-display: swap y fuentes de respaldo.
- public/licenses/: licencias originales de ambas fuentes, incluidas
  también en la compilación.

La pantalla inicial se revisó a 390 × 844, 320 × 800 y 768 × 1024,
además de la ampliación del navegador al 200 %.

Se comprobó el acceso al contenido mediante teclado y el foco visible.
Estas pruebas deberán repetirse en las futuras pantallas de negocio.

La pantalla actual no utiliza animaciones ni desplazamiento animado.
Las futuras interacciones deberán respetar prefers-reduced-motion.

## Configuración de la API

Crear `.env` tomando como referencia `.env.example`.

En desarrollo, `VITE_API_URL` apunta a `http://127.0.0.1:3000`.
Reiniciar Vite después de modificar la configuración.

`src/config/env.js` valida la dirección antes de mostrar la
aplicación. Si es inválida, aparece “Sistema no disponible”.
Esta validación no comprueba que el backend esté encendido.

`.env.production.example` documenta `/api` para una publicación
conjunta. Los archivos terminados en `.example` no se cargan
automáticamente.

Las variables `VITE_` quedan disponibles en el frontend:
no colocar contraseñas ni secretos en ellas.