## Estado del proyecto

- Fase 1: estructura inicial, repositorio Git y publicación en GitHub.
- Fase 2: backend inicial con Express, configuración de puerto y dirección,
  registros con Pino, CORS local, manejo de errores y cierre ordenado.
- Fase 3: frontend inicial con React y Vite, pantalla de comprobación,
  estilos básicos, revisión con ESLint y compilación de producción.
- Fase 4: Tailwind CSS, colores compartidos, fuentes locales con licencias,
  foco visible y comprobaciones iniciales de adaptación y teclado.
  - Fase 5: configuración de entorno centralizada y validada,
  plantillas de desarrollo y producción, rechazo de configuración
  inválida y comprobaciones de privacidad en compilación y registros.

El frontend muestra una pantalla inicial. La conexión entre frontend
y backend, las pantallas de negocio y MySQL todavía no están implementados.

## Preparación del backend

Ejecutar desde la carpeta CODIGO:

```powershell
# Entramos a la carpeta del backend.
cd backend

# Instalamos las versiones guardadas en package-lock.json.
npm.cmd ci

# Creamos la configuración local al preparar el proyecto por primera vez.
# Si .env ya existe, conservarlo y omitir este comando.
Copy-Item .env.example .env
```

La configuración de ejemplo utiliza el puerto 3000 y la dirección
127.0.0.1. El archivo .env es privado y no se sube a Git.

## Ejecución del backend

Ejecutar desde la carpeta CODIGO/backend:

```powershell
# Iniciamos con reinicio automático al modificar el código.
npm.cmd run dev
```

Para ejecutar sin reinicio automático:

```powershell
# Iniciamos el servidor mediante el script start.
npm.cmd start
```

Consultar http://127.0.0.1:3000/health para comprobar que el servidor
responde. Esta ruta todavía no comprueba una base de datos.

Durante el desarrollo, CORS permite el origen http://localhost:5173.

Para detener el servidor, presionar Ctrl + C. Si Windows pregunta
si se desea terminar el trabajo por lotes, responder S.

## Ejecución del frontend

Ejecutar desde la carpeta CODIGO/frontend:

```powershell
# Instalamos las dependencias al preparar una nueva copia del proyecto.
npm.cmd ci

# Iniciamos el servidor de desarrollo.
npm.cmd run dev
```

Abrir http://localhost:5173. El puerto está fijado; si está ocupado,
Vite muestra un error.

Para revisar y compilar, utilizar otra terminal en CODIGO/frontend:

```powershell
# Revisamos el código mediante ESLint.
npm.cmd run lint

# Generamos los archivos de producción en dist.
npm.cmd run build
```

Las instrucciones completas están en frontend/README.md.

## Archivos y configuración

Las dependencias, los archivos generados y la configuración privada
están excluidos mediante .gitignore.

Los archivos .env.example contienen únicamente ejemplos sin secretos.
Los archivos package-lock.json se conservan en Git para reproducir
las versiones de las dependencias.

## Configuración de entorno y seguridad base

El backend utiliza `src/config/env.js` para cargar y validar la
configuración antes de abrir el puerto HTTP.

Se validan el entorno, puerto, host no vacío, origen CORS y formato
del secreto JWT. La configuración de MySQL queda agrupada y se
comprueban host no vacío, puerto y formato del nombre de la base.

El usuario, contraseña y certificado de MySQL se completarán al
preparar la conexión en la fase 6. JWT todavía no se utiliza para
autenticar: su secreto queda preparado para la fase correspondiente.

El frontend valida `VITE_API_URL` mediante `src/config/env.js`.
Si la configuración es inválida, muestra “Sistema no disponible”
sin sustituir silenciosamente la dirección.

Los archivos `.env` son privados. Los archivos `.env.example` y
`.env.production.example` documentan la configuración sin secretos.
Las variables `VITE_` son públicas y no deben contener credenciales.

En desarrollo se utiliza `http://127.0.0.1:3000`. Para publicación
conjunta, la plantilla del frontend utiliza `/api`; el servidor de
producción deberá dirigir esa ruta al backend.

### Comprobaciones realizadas

- API `/health`: respuesta HTTP 200 y origen CORS configurado.
- Backend: rechazo de JWT vacío, puerto HTTP inválido,
  origen CORS inválido y puerto MySQL inválido.
- Frontend: aviso ante una dirección API inválida y recuperación
  al restaurar la configuración correcta.
- ESLint y compilación del frontend completados sin errores.
- Secreto JWT ausente de los 18 archivos compilados revisados.
- Contraseña MySQL pendiente de configurar y comprobar.
- Pino elimina las rutas de campos sensibles configuradas,
  comprobado mediante valores ficticios.