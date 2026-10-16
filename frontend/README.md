# Frontend de La Veneziana

Interfaz web del sistema de la pizzería, construida con React y Vite.

## Estado actual

La pantalla de login está conectada al backend mediante cookies HttpOnly.
Zustand conserva la identidad en memoria y recupera la sesión al recargar;
no se guardan tokens ni contraseñas en localStorage.

Utiliza el logo original, vidrio, colores compartidos, Inter, Montserrat
y Playfair Display locales, foco visible y efectos con movimiento reducido.
Se puede ingresar, consultar la identidad y cerrar la sesión. React Router
protege /inicio por sesión y /seguridad por seguridad/gestionar. La consulta
inicial debe terminar antes de mostrar las páginas. Sin sesión se redirige
a /login; sin permiso se muestra acceso restringido. El backend mantiene
la autorización real en cada solicitud. Las pantallas del negocio siguen
pendientes.

Seguridad consulta los roles existentes sin modificarlos. Las rutas
desconocidas muestran Página no encontrada. Después del login se recupera
el destino interno solicitado; con sesión activa no se vuelve al formulario.

## Componentes compartidos

components/ui contiene BotonBase, BotonSecundario (dorado), BotonPeligro
(rojo oscuro) y Badge. Los botones admiten carga y deshabilitado y respetan
movimiento reducido; las etiquetas ofrecen variantes neutro, exito,
advertencia y peligro. Inicio reutiliza el botón dorado y las etiquetas.

En desarrollo, /componentes permite revisar sus estados con una sesión
que tenga seguridad/gestionar. Sus controles solo modifican un mensaje
local y no operan sobre datos del negocio. La ruta no se registra en
producción. El selector global claro/oscuro queda para los layouts de la
fase 17; actualmente el login mantiene su presentación oscura.

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

Preparar el .env a partir de .env.example si no existe, conservando cualquier
configuración local previa. Usar VITE_API_URL=/api. El proxy de Vite reenvía
/api al backend de http://127.0.0.1:3000, que debe estar ejecutándose.
CORS_ORIGIN del backend debe coincidir con http://localhost:5173.
Las mutaciones incluyen X-CSRF-Protection: 1 y las solicitudes envían cookies.
Reiniciar Vite después de cambiar la configuración.

En producción, publicar /api bajo el mismo origen con HTTPS para utilizar
la cookie Secure. El proxy de desarrollo no se aplica a los archivos compilados.
El alojamiento debe servir index.html para las rutas del frontend, sin
interceptar /api, para admitir aperturas directas con BrowserRouter.

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
