# Mis trabajadores

> Rutas y comandos: salvo indicación expresa, las rutas de código y los comandos de esta guía son relativos a `backend/`, no a la carpeta del documento.

Mejora administrativa posterior a la fase 40. Permite crear las cuentas que
se entregan a cocineros, meseros, cajeros y demás perfiles existentes. Solo las
cuentas con permiso `seguridad/gestionar` pueden entrar o usar su API.

## Uso

1. Entrar a **Mis trabajadores → Agregar trabajador**.
2. Indicar nombre, usuario, perfil, estado y contraseña; correo, documento y
   fecha de contratación son opcionales. El formulario muestra los permisos
   reales del perfil elegido.
3. Entregar el usuario y la contraseña al trabajador por un medio apropiado.
   Podrá ingresar con el usuario o con su correo, si se registró.
4. **Editar** permite modificar los datos y cambiar el perfil. **Contraseña**
   establece una nueva, sin recuperar ni mostrar la anterior.
5. **Eliminar** da de baja la cuenta y cierra sus sesiones. Conserva su autoría
   en pedidos, caja y ventas. El filtro **Dados de baja** permite encontrarla
   y editar su estado para reactivarla. Sus identificadores siguen reservados.

El usuario admite de 3 a 40 letras sin tildes, números, puntos, guiones y guion
bajo; empieza con letra o número y se normaliza a minúsculas. La contraseña
requiere 12 caracteres como mínimo y 72 bytes UTF-8 como máximo.

## Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `migrations/0052-agregar-usuario-acceso.js` | Agrega alias único y correo opcional sin modificar las cuentas existentes. |
| `src/models/Usuario.js` | Mapeo de los campos de identidad en MySQL. |
| `src/services/trabajadores.service.js` | Validación, búsqueda, altas, cambios, contraseñas, bajas y auditoría transaccional. |
| `src/routes/trabajadores.routes.js` | Endpoints autenticados y autorización administrativa. |
| `src/validators/login.js`, `src/services/auth.service.js` | Login con usuario o correo; mantiene el acceso anterior. |
| `../frontend/src/pages/Trabajadores.jsx` | Listado con búsqueda, filtros, paginación y acciones. |
| `../frontend/src/components/seguridad/FormularioTrabajador.jsx` | Formularios, confirmaciones y vista de permisos del perfil. |
| `../frontend/src/services/trabajadores.service.js` | Solicitudes HTTP y claves de idempotencia. |
| `../frontend/src/styles/trabajadores.css` | Presentación adaptable y modos claro/oscuro. |
| `../frontend/src/App.jsx`, `layouts/AdminLayout.jsx`, `pages/Inicio.jsx` | Ruta protegida y accesos de navegación; los dos últimos bajo `src`. |

La migración ya se aplicó en el entorno local. En otro entorno ejecutar desde
`backend`: `npm.cmd run db:migrate -- up`, antes de iniciar el backend actualizado.

## API y garantías

- `GET /api/trabajadores`: filtros `busqueda`, `estado`, `rol_id`, `pagina`, `limite`.
- `POST /api/trabajadores`: crear cuenta.
- `PATCH /api/trabajadores/:id`: actualizar con revisión vigente.
- `POST /api/trabajadores/:id/password`: restablecer con revisión vigente.
- `DELETE /api/trabajadores/:id`: baja lógica con revisión vigente.

Las escrituras exigen CSRF e `Idempotency-Key`. Se comprueba la revisión para
evitar sobrescribir cambios ajenos. Las operaciones de seguridad se serializan
y revalidan al gestor dentro de la transacción. Se protege el último administrador
activo y se impide cambiar el propio perfil/estado, darse de baja o restablecer
la propia contraseña mediante esta herramienta. La recuperación local del
administrador conserva su comando independiente `npm.cmd run admin:recuperar`.

Cambiar usuario, correo, perfil, estado o contraseña revoca las sesiones de esa
cuenta. Las contraseñas se guardan con bcrypt, nunca se devuelven y no aparecen
en auditoría ni almacenamiento del navegador. La idempotencia usa una firma
HMAC para distinguir reintentos de contraseña sin persistir el secreto.

## Verificación

Desde `backend`:

```powershell
npm.cmd run test:trabajadores
npm.cmd run test:trabajadores:integracion
```

La integración usa MySQL y cuentas temporales que elimina al terminar. Comprueba
login, permisos, CSRF, idempotencia, duplicados, revisiones, cambio de perfil y
contraseña, cierre de sesiones, baja/reactivación y ausencia de secretos.

Desde `frontend`, con Vite disponible en el puerto 5173 y Playwright instalado:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:trabajadores:navegador -- RUTA_AL_MODULO_PLAYWRIGHT
npm.cmd run test:sesion:navegador -- RUTA_AL_MODULO_PLAYWRIGHT
```

El ensayo de trabajadores usa una API interceptada sin modificar cuentas reales;
cubre formularios, búsqueda, perfiles, contraseñas, baja/reactivación, permisos y
anchos de 320 a 1920 píxeles en ambos temas. También se verificó la regresión de
sesión: fallo temporal sin cierre, persistencia sin interacción y límite de ocho
horas. No se crearon trabajadores de ejemplo en la base real.
