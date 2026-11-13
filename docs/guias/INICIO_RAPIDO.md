# Inicio rápido

Los comandos siguientes parten de `CODIGO`, la carpeta del repositorio.
Se usa PowerShell y `npm.cmd`. El proyecto se ha trabajado con Node.js 24,
npm y MySQL local; las versiones concretas de dependencias están fijadas en
los `package-lock.json` de cada aplicación.

## Si ya está instalado

Encender MySQL y abrir dos terminales desde `CODIGO`.

```powershell
# Terminal del backend
cd backend
npm.cmd run dev
```

```powershell
# Otra terminal, para el frontend
cd frontend
npm.cmd run dev
```

Entrar a **http://localhost:5173** e iniciar sesión con una cuenta creada para
el sistema. No hay una contraseña universal documentada.
Cada perfil ve sus [secciones autorizadas](../seguridad/PERFILES_ACCESO.md).
Para detener un servidor, usar Ctrl+C en su propia terminal.

## Preparar una copia nueva

Instalar las dependencias del backend y crear su configuración solo si no existe:

```powershell
cd backend
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
if (-not (Test-Path -LiteralPath .env.migrations)) {
  Copy-Item -LiteralPath .env.migrations.example -Destination .env.migrations
}
```

Completar esos archivos con las credenciales de la instancia MySQL elegida y
el secreto de JWT. El ejemplo local de MySQL usa puerto **3307** y base
`la_veneziana`; no asumir que otra instalación tiene esos mismos valores.
[Configuración y separación de usuarios de base de datos](CONFIGURACION.md).

Para una base nueva, desde `backend`, revisar y aplicar migraciones, cargar
roles/permisos iniciales y crear el primer administrador:

```powershell
npm.cmd run db:migrate -- pending
npm.cmd run db:migrate -- up
npm.cmd run db:seed
node scripts/crear-admin.js
```

Estos comandos preparan datos y esquema de la base configurada. No importar
además el SQL de referencia sobre una instalación ya migrada. La carga de carta,
recetario y proveedores es un paso separado, descrito en sus guías; iniciar los
servidores no ejecuta esas cargas automáticamente.

En otra terminal desde `CODIGO`, preparar el frontend:

```powershell
cd frontend
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
npm.cmd run dev
```

## Comprobar que está encendido

| Dirección | Qué comprueba |
|---|---|
| `http://127.0.0.1:3000/health` | El proceso HTTP responde; no prueba MySQL. |
| `http://127.0.0.1:3000/ready` | La API puede conectarse a MySQL. |
| `http://localhost:5173` | La interfaz y el proxy local de Vite. |

Un puerto ocupado produce `EADDRINUSE`. Una API apagada o una conexión MySQL
fallida puede impedir comprobar la sesión. Ver el
[diagnóstico](CONFIGURACION.md#diagnóstico-rápido) antes de cambiar contraseñas.

## Administrador local: contraseña olvidada

Desde `backend`: `npm.cmd run admin:recuperar`. El comando pide el identificador
y una nueva contraseña oculta, conserva el perfil y revoca sesiones anteriores.
No recibe contraseñas en argumentos ni las guarda en esta documentación.
Es una herramienta local de recuperación, no un endpoint público.

Después de arrancar: [pruebas](PRUEBAS.md), [estructura](ESTRUCTURA.md) e
[índice completo](../README.md).
