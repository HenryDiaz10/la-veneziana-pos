# Sesiones activas y cierres inesperados

## Causa y comportamiento actual

El token y su cookie vencían de forma fija a los 15 minutos del login. No existía
renovación, por lo que la siguiente consulta protegida enviaba al operador al login
aunque hubiera seguido trabajando en formularios o en el carrito local.

Por indicación del propietario, la política actual es una sesión fija de **ocho
horas aunque no haya interacción**. JWT, cookie y registro en MySQL tienen ese
plazo desde el inicio de sesión. El límite absoluto se comprueba en todas las
rutas protegidas. La inactividad, cambiar de pestaña o suspender los temporizadores
del navegador no acortan el plazo. Navegar tampoco lo extiende más allá de ocho horas.

Las sesiones antiguas de quince minutos todavía vigentes se adaptan a través de
`GET /api/auth/session`, conservando su fecha original de creación como inicio
del límite. Las sesiones ya vencidas, revocadas o de usuarios suspendidos no se
recuperan. No se crearon tablas ni se guardan credenciales en JavaScript.

## Comprobaciones periódicas y errores de conexión

`frontend/src/components/MantenerSesion.jsx` consulta la vigencia y los permisos
como máximo una vez por minuto, sin exigir pulsaciones ni visibilidad. También
comprueba al recuperar conexión, foco o cambiar la visibilidad. Estas consultas
no son necesarias para conservar una sesión nueva de ocho horas: el plazo está
en el servidor y no depende de temporizadores. No hay un cierre por inactividad
a los quince minutos bajo esta política.

Las comprobaciones con identidad existente son silenciosas: no desmontan la
pantalla ni borran formularios. Una desconexión o respuesta 5xx muestra un aviso
y permite reintentar manteniendo la identidad visual; el servidor sigue validando
cada operación. Un 401 confirmado lleva al login con un mensaje explicativo.
La recuperación inicial sin conexión mantiene la pantalla de reintento protegida.
La consulta de sesión tiene un tiempo máximo de diez segundos.

## Revocación y concurrencia

- La cookie sigue siendo HttpOnly y SameSite=Lax, con Secure en producción.
- La adaptación de sesiones antiguas conserva el identificador de sesión y su revocación en MySQL.
- La fila se bloquea al renovar para evitar acortar su plazo o perder un logout
  concurrente. No se aceptan tokens vencidos como tokens de renovación.
- Un 401 no borra cookies: una respuesta antigua no debe eliminar la cookie de
  una sesión nueva. La cookie vencida caduca en el navegador; logout la elimina.
- Login y logout cancelan la consulta pendiente e invalidan su versión de identidad,
  evitando que una respuesta tardía restaure una sesión o una cookie vieja.
- Cambios de usuario/rol y permisos se siguen comprobando en el servidor.
- El borrador confirmado del carrito permanece separado por empleado en su
  almacenamiento existente; un cierre real retira su copia en memoria.

El límite absoluto se aplica en el servidor. Como referencia conceptual: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration).

## Archivos principales

Backend: `src/security/sesion.js` (política y límite), `security/token.js` (firma),
`middlewares/autenticar.js` (sesión/permisos/límite), `middlewares/renovarSesion.js`
(renovación), `routes/auth.routes.js` y `controllers/auth.controller.js`.
Frontend: `components/MantenerSesion.jsx`, `stores/auth.store.js`,
`services/auth.service.js` y su integración en `App.jsx`.

## Pruebas

Desde backend, con MySQL local de desarrollo:

```powershell
npm.cmd run test:sesion:integracion
node tests/sesion-integracion.mjs --comprobar-servidor-actual
```

Crean y retiran solamente su usuario y sesiones temporales. Usan tokens de prueba
con tiempos simulados; no imprimen cookies ni claves. Comprueban ocho horas de duración, seis horas simuladas sin renovaciones,
adaptación de sesiones cortas, peticiones simultáneas, revocación, JWT vencido, límite absoluto y recuperación
después de un fallo de base de datos. El segundo comando comprueba además que
el backend actualmente escuchando tenga cargado el cambio.

Desde frontend, con Vite activo y Playwright/Edge disponibles:

```powershell
npm.cmd run test:sesion:navegador
```

También admite `node tests/sesion-navegador.mjs <ruta-a-playwright/index.mjs>`.
Con API simulada y reloj controlado verifica actividad, veinte minutos sin
interacción en segundo plano, conservación del formulario, error temporal sin
logout, corte al cumplirse ocho horas, borrador guardado y logout concurrente.
Se comprobaron además ESLint, build e integración de permisos del POS.

El servidor que estaba ejecutándose fue comprobado con la nueva renovación.
Una sesión que ya haya vencido requiere ingresar de nuevo una vez.
