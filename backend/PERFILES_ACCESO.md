# Secciones y funciones por perfil

## Distribución vigente

| Perfil | Secciones disponibles |
|---|---|
| Administrador | Inicio, Mis trabajadores, Reportes gerenciales, Historial de ventas, Estado de resultados, Salón y mesas, Arqueo de caja, Catálogo, Recetas, Clientes, Inventario y Compras. |
| Mesero | Inicio, Salón y mesas, Tomar pedido y Clientes. |
| Cajero | Inicio, Punto de venta, Pagos de pedidos, Arqueo de caja y Clientes. |
| Cocinero | Inicio y Cocina y despacho. |

El mesero registra pedidos de salón y sus indicaciones. El cajero atiende la
venta de mostrador, cobra pedidos ya registrados y entrega tickets. El cocinero
actualiza preparaciones y despacho. La administración configura zonas, mesas,
cajas y cajeros y mantiene la gestión comercial, sin acceder al POS, toma de
pedidos, cobros o tablero de cocina. La gestión de trabajadores continúa en
Mis trabajadores; Seguridad, Componentes y Pruebas de carrito no son secciones
operativas accesibles por URL.

Clientes conserva el alcance de cada permiso: mesero y cajero tienen búsqueda;
administrador puede gestionar. Arqueo conserva los controles de propiedad del
turno; la configuración y asignación de cajas exige el permiso administrativo.

## Cómo se aplica

- `frontend/src/utils/accesos.js`: lista única de secciones, roles y permisos.
  La usan `AdminLayout`, `Inicio` y `ProtectedRoute`. Un enlace oculto tampoco
  abre su página al escribir la URL; los módulos ajenos no se montan ni consultan.
- `src/security/perfiles.js`: techo de permisos de los cuatro perfiles del sistema,
  intersectado con los permisos asignados en MySQL. No concede permisos nuevos.
  El administrador conserva `ventas/devolver` para autorizaciones administrativas,
  pero no `ventas/cobrar`, `pedidos/crear` ni `kds/operar`.
- `src/services/auth.service.js` y `src/middlewares/autenticar.js`: calculan los
  mismos permisos efectivos al iniciar sesión y en cada solicitud autenticada.
  Los endpoints conservan sus comprobaciones de permiso y CSRF existentes.
- `src/services/roles.service.js`: la ficha de perfiles en Mis trabajadores muestra
  los permisos efectivos, coherentes con los accesos disponibles.
- `Salon.jsx`: las acciones de tomar o cobrar pedidos también comprueban el acceso
  a su sección; no aparecen enlaces operativos para el administrador.

Los perfiles personalizados mantienen sus permisos explícitos de base de datos.
No se borran asignaciones ni se cambia el esquema. Tras actualizar el servidor,
recargar la web recupera los permisos de la sesión vigente. Cambiar el perfil de
un trabajador conserva la revocación de sesiones existente.

## Verificación

- `frontend/tests/accesos-perfiles.test.mjs`: matrices exactas de los cuatro roles,
  permisos insuficientes, permisos de más, rutas retiradas y ausencia de concesiones.
- `frontend/tests/perfiles-navegador.mjs`: menú e Inicio coherentes, URL ajena
  rechazada antes de consultar API, escritorio y menú móvil.
- `tests/pos-integracion.js`: sesiones reales locales, carta autorizada para mesero
  y cajero, administración de catálogo para administrador y 403 en rutas ajenas.
- Navegador: pedidos del mesero, recuperación de respuesta perdida, cobro del cajero,
  KDS del cocinero y estabilidad del menú.
- Integración local: gestión de trabajadores, reportes, configuración de salón y
  cajas/asignación, con limpieza o rollback de los datos de prueba.

No es necesario ejecutar migraciones o modificar contraseñas para este cambio.
