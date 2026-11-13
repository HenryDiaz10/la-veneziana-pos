# Seguridad del sistema

Resumen vigente para localizar los controles. Los perfiles del sistema se
limitan por función; conocer una URL o modificar el menú del navegador no
autoriza una operación del servidor.

## Autenticación, autorización y auditoría

| Control | Comportamiento | Implementación |
|---|---|---|
| Autenticación | Contraseña con hash, token firmado y sesión registrada en MySQL. La identidad se recupera mediante cookie HttpOnly. | [auth.service.js](../../backend/src/services/auth.service.js), [password.js](../../backend/src/security/password.js), [token.js](../../backend/src/security/token.js). |
| Autorización | Cada solicitud vuelve a consultar usuario, estado, sesión y permisos efectivos. Las rutas requieren el módulo/acción apropiados. | [autenticar.js](../../backend/src/middlewares/autenticar.js), [exigirPermiso.js](../../backend/src/middlewares/exigirPermiso.js), [perfiles.js](../../backend/src/security/perfiles.js). |
| Auditoría | Cambios sensibles y comerciales generan registros; el journal/outbox permite rastrear operaciones sin repetir el cobro. | [operacion-comercial.js](../../backend/src/services/operacion-comercial.js), [trabajadores.service.js](../../backend/src/services/trabajadores.service.js). |

Estas tres responsabilidades corresponden a autenticación, autorización y
registro de actividad (AAA). Registrar actividad no equivale a publicar datos
personales o contraseñas en los logs.

## Escenarios comunes

| Escenario | Resultado esperado |
|---|---|
| Entrar a una ruta protegida sin sesión | El frontend conduce al login; la API devuelve 401. |
| Mesero intenta abrir reportes o caja por URL | Sección bloqueada; las APIs requieren permisos que no tiene. |
| Cajero intenta administrar trabajadores | No tiene `seguridad/gestionar`; la API rechaza la operación. |
| Usuario cambia de perfil o se suspende | La gestión de trabajadores revoca sus sesiones conforme a sus reglas. |
| Falla temporal de red o MySQL | Error recuperable; no se trata automáticamente como contraseña incorrecta. |
| Se pierde la respuesta de un pedido/cobro | Se recupera la identidad existente antes de intentar otra operación. |

Detalles: [perfiles](PERFILES_ACCESO.md), [sesiones](SESIONES.md),
[trabajadores](TRABAJADORES.md) y [recuperación comercial](../operacion/VENTA_FINAL.md).

## Otros controles

- Login con límites de intentos y bloqueos temporales.
- Origen y protección CSRF para escrituras autenticadas con cookie.
- Validación de entradas, SQL parametrizado y transacciones de negocio.
- Snapshots para conservar importes y preparaciones históricas.
- Comprobación de caja/mesa/propiedad y revisiones antes de cambios operativos.
- Contraseñas y token fuera de localStorage; las variables `VITE_` no son secretas.

La [estructura](../guias/ESTRUCTURA.md) permite localizar código y pruebas.
Las reglas concretas por endpoint están en cada guía temática y en sus rutas;
este resumen no sustituye una auditoría externa ni afirma que haya emisión SUNAT
o impresión física por disponer de tickets internos.
