# Frontend de La Veneziana

Interfaz web del sistema de la pizzería, construida con React y Vite.

## Estado actual

La fase 3 prepara la estructura inicial y una pantalla de comprobación.
Las pantallas de negocio y la conexión con el backend todavía no están
implementadas.

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