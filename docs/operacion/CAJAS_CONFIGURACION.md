# Administración de cajas y asignación de cajeros

> Rutas y comandos: salvo indicación expresa, las rutas de código y los comandos de esta guía son relativos a `backend/`, no a la carpeta del documento.

En **Arqueo de caja → Administrar cajas**, el administrador crea una terminal
con nombre, responsable, estado (activa/mantenimiento) e IP opcional. Puede
editarla y reasignarla cuando no tenga turno abierto. La IP es informativa:
no representa una lista de equipos autorizados.

## Reglas

- Configurar exige `caja/gestionar` y `seguridad/gestionar`; el backend vuelve
  a comprobar estos permisos dentro de la transacción de escritura.
- Solo se ofrecen responsables activos con `caja/gestionar` y `ventas/cobrar`.
  Incluye al administrador si tiene estos permisos. No es obligatorio que
  el nombre literal del perfil sea «cajero».
- Cada terminal admite un responsable; una persona puede tener varias cajas
  asignadas, pero sigue admitiéndose solo un turno abierto por cajero y caja.
- Crear/asignar no abre un turno. El responsable inicia sesión y confirma
  la apertura con su fondo inicial. Solo ve sus cajas activas asignadas.
- Una caja sin asignación no admite aperturas. Las terminales anteriores
  quedan sin asignar hasta que el administrador las configure: no se inventan
  responsables. Los turnos ya abiertos siguen con su titular original.
- Cambiar el responsable, nombre o estado de una caja con turno abierto se
  rechaza. Debe cerrarse primero. La reasignación nunca cambia responsables,
  importes ni snapshots de los turnos cerrados.
- Si el trabajador se suspende o pierde permisos, deja de ser elegible para
  nuevas aperturas. Sus asignaciones se muestran con advertencia y deben
  revisarse; no se borran silenciosamente.
- No se elimina físicamente una caja: mantenimiento conserva su historial.
- Se valida nombre único entre terminales, IPv4/IPv6, campos y versión vigente.
  Idempotencia, transacciones y auditoría protegen escrituras y reintentos.

## Archivos y API

`migrations/0053-asignar-cajeros-cajas.js` agrega responsable con clave foránea
y revisión. `models/CajaFisica.js` expone ambos campos. Se aplica desde backend
con `npm.cmd run db:migrate -- up` (ya aplicada en el entorno local).

En `src/services/cajas-configuracion.service.js`, `listarConfiguracionCajas`
devuelve terminales, asignaciones, turnos abiertos y candidatos elegibles;
`validarConfiguracionCaja` valida datos; `guardarConfiguracionCaja` crea/edita
con revisión y auditoría; `comprobarCajero` verifica permisos actuales.
`src/services/caja.service.js` filtra la consulta del cajero y valida asignación
al abrir. No cambia los procedimientos de cobro, movimientos o cierre.

Rutas de `src/routes/caja.routes.js`:

- `GET /api/caja/configuracion`: configuración y candidatos.
- `POST /api/caja/configuracion`: crear terminal.
- `PATCH /api/caja/configuracion/:id`: editar, incluyendo `version_config`.

Escrituras con Origin autorizado, `X-CSRF-Protection` e `Idempotency-Key`.
El cuerpo contiene `nombre_terminal`, `ip_maquina`, `estado`,
`cajero_asignado_id` (o null). La edición exige `version_config` vigente.

Frontend: `src/components/caja/ConfiguracionCajas.jsx` presenta listado y modal;
`src/styles/cajas-configuracion.css` adapta las tarjetas a laptop/celular;
`src/pages/ArqueoCaja.jsx` integra el acceso exclusivo administrativo y actualiza
el selector de apertura tras guardar. Los reintentos inciertos conservan cuerpo
y clave de operación, sin crear terminales duplicadas.

## Validación

Desde backend:

```powershell
npm.cmd run test:cajas:configuracion
npm.cmd run test:cajas:configuracion:integracion
```

La integración crea y limpia fixtures locales: prueba 401/403/CSRF, asignación,
perfil y estado del cajero, duplicados, reintentos, revisiones concurrentes,
apertura ajena, protección de turno abierto, cierre, reasignación histórica,
mantenimiento y baja de elegibilidad. Se adaptaron las fixtures anteriores de
caja, pedidos, mesas y modificadores para asignar su responsable explícitamente.

Desde frontend, con Vite activo y módulo Playwright disponible:

```powershell
npm.cmd run test:cajas:configuracion:navegador -- RUTA_AL_MODULO_PLAYWRIGHT
```

Por defecto abre `http://127.0.0.1:5173/caja`; puede indicarse `TEST_BASE_URL`.
Usa API interceptada, sin datos reales. Revisa creación, reintento tras respuesta
perdida, edición, mantenimiento, turno abierto, acceso administrativo y ausencia
de desbordamiento entre 320 y 1920 píxeles, con ambos temas.
