# Configuración, puertos y diagnóstico

## Archivos de entorno

| Archivo desde CODIGO | Responsabilidad |
|---|---|
| `backend/.env` | Ejecución: MySQL, host/puerto HTTP, origen y secreto JWT. |
| `backend/.env.migrations` | Conexión independiente para modificar el esquema. |
| `frontend/.env` | Configuración pública de la interfaz; ejemplo `VITE_API_URL=/api`. |
| `backend/.env.production.example` | Plantilla de producción, si se prepara ese entorno; no prueba un despliegue. |

Consultar las plantillas públicas [backend](../../backend/.env.example),
[migraciones](../../backend/.env.migrations.example) y
[frontend](../../frontend/.env.example). No sobrescribir archivos locales al
copiar ejemplos. Los `.env` privados están excluidos de Git. Las variables
`VITE_` son públicas: no colocar allí contraseñas ni el secreto JWT.

Las validaciones de [env.js](../../backend/src/config/env.js) son la fuente
de las reglas concretas. Las credenciales del proceso y las de migraciones
tienen usos separados; ejecutar pruebas con la cuenta correcta no autoriza
a borrar o recrear la base existente.

## Puertos utilizados

| Proceso | Valor del ejemplo local | Configuración |
|---|---|---|
| Frontend/Vite | `localhost:5173` | [vite.config.js](../../frontend/vite.config.js), puerto estricto. |
| Backend HTTP | `127.0.0.1:3000` | `HOST` y `PORT` en backend. |
| MySQL | `3307` en la plantilla local | `DATABASE_PORT`; usar el de la instancia real. |
| WebSocket KDS | Comparte `/api` con HTTP | Proxy WebSocket de Vite; no hay otro puerto público obligatorio. |
| Agente de impresión | No escucha puertos | Cliente HTTP de una pasada, descrito en [su entrada](../../agente-impresion/README.md). |

Estos son puertos lógicos TCP, distintos de conectores físicos USB/Ethernet.
El navegador usa `localhost:5173`; Vite reenvía `/api` al backend `127.0.0.1:3000`.
Mantener coherente `CORS_ORIGIN` con el origen del navegador. Cambiar `PORT` no
cambia por sí mismo el destino del proxy de Vite.

## Base de datos y migraciones

Modelos: [backend/src/models](../../backend/src/models).
Migraciones: [backend/migrations](../../backend/migrations).
El ejecutor utiliza Umzug y la conexión de migraciones.

Desde `backend`:

```powershell
npm.cmd run db:migrate -- pending
npm.cmd run db:migrate -- executed
```

Para aplicar pendientes a la base elegida: `npm.cmd run db:migrate -- up`.
`down` revierte esquema; no es parte del arranque cotidiano.
Los scripts de carga de negocio tienen sus propios modos de validación/aplicación:
[carta](../catalogo/CARTA.md), [recetario](../catalogo/RECETARIO.md),
[proveedores](../inventario/PROVEEDORES.md) y
[abastecimiento](../inventario/ABASTECIMIENTO_INICIAL.md).

## Diagnóstico rápido

| Síntoma | Qué revisar |
|---|---|
| `EADDRINUSE` en 3000 o 5173 | Ya existe un proceso en ese puerto. Reutilizar la terminal correcta o detener el proceso identificado. |
| `/health` no responde | Proceso del backend y errores de configuración al arrancar. |
| `/health` responde, `/ready` devuelve 503 | Servicio MySQL, host/puerto/base y credenciales locales. |
| «No pudimos comprobar tu sesión» | Conectividad API/proxy y `/ready`; usar Reintentar. No equivale necesariamente a contraseña incorrecta. |
| Error de origen/CSRF | Origen configurado, cookies y llamadas mediante `/api`. |
| Perfil o menú anterior | Recargar para consultar la sesión; el servidor recalcula los permisos efectivos. |
| Ticket pendiente | Venta confirmada e impresión son estados diferentes. Ver [POS](../operacion/POS.md#ticket-después-del-cobro). |

Al compartir un error, usar el mensaje y la ruta del código, no el contenido
de los archivos privados. [Sesiones](../seguridad/SESIONES.md) explica el límite
de ocho horas y la diferencia entre una revocación y un fallo temporal.
