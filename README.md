## Estado del proyecto

- Fase 1: estructura inicial, repositorio Git y publicación en GitHub.
- Fase 2: backend inicial con Express, configuración de puerto y dirección,
  registros con Pino, CORS local, manejo de errores y cierre ordenado.
- Fase 3: frontend inicial con React y Vite, pantalla de comprobación,
  estilos básicos, revisión con ESLint y compilación de producción.

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