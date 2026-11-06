# Configuración administrativa de zonas y mesas

En **Salón y mesas**, usuarios con `mesas/gestionar` y `configuracion/gestionar`
pueden crear/editar zonas y aforo, añadir mesas por zona, cambiar código/sillas/
ubicación, reubicar e inhabilitar/reactivar mesas. Se pueden eliminar zonas
vacías, previa confirmación. No se eliminan mesas ni historial.

## Uso y reglas

1. **Nueva zona**: nombre (2–50 caracteres) y aforo (0–10,000). Cero significa
   sin aforo definido. Se rechazan nombres duplicados.
2. **Nueva mesa**: elegir zona, código único en todo el restaurante (hasta 10
   letras/números/guiones), sillas (1–50), disponibilidad y ubicación opcional.
3. Seleccionar una mesa y pulsar **Editar configuración de mesa** para editarla
   o cambiarla de zona. Solo mesas libres/inhabilitadas, sin responsable ni cuenta
   abierta/en pago. Ocupadas/por limpiar deben terminar su atención primero.
4. **Editar zona** cambia nombre/aforo. **Eliminar zona vacía** exige que no tenga
   mesas, incluidas las inhabilitadas. Confirmar no afecta otras zonas.

Si hay aforo definido, la suma de sillas de todas las mesas de la zona no puede
superarlo, incluidas las inhabilitadas. Se verifica al crear/mover mesas y reducir
aforo. Coordenadas: ambas vacías o enteros 0–10,000. El croquis las normaliza;
si no hay espacio o se superponen, se utiliza la cuadrícula existente.
No se agregan zonas ni mesas de ejemplo automáticamente.

## Seguridad y persistencia

Se reutilizan `zonas_restaurante` y `mesas_salon`, sin migración. El identificador
de la mesa y los pedidos anteriores se conservan al reubicar o inhabilitar.
Los usuarios que solo operan mesas no ven los controles; las rutas rechazan
escrituras sin permiso administrativo. Mantienen sesión, CSRF y origen.

Las operaciones son transaccionales e idempotentes, con barrera de rol/actor,
bloqueo de mesa frente a la atención concurrente y validación de aforo/duplicados.
Ediciones exigen revisión SHA-256; zonas incluyen última marca de auditoría,
mesas su ciclo/cuenta. Un cambio ajeno causa conflicto, sin sobrescribirlo.
La configuración de mesa genera auditoría y evento `mesa.configurada` en salón.

Si se pierde una respuesta, el modal conserva clave/datos y permite reintentar
sin duplicar; queda bloqueado su cierre hasta resolver ese intento. Errores de
validación permiten corregir campos. Para revisión antigua, cerrar, actualizar
mapa y volver a abrir la edición.

## API y archivos

`GET /api/salon` incluye ahora revisión de zona. Escrituras con
`Idempotency-Key`, permiso `configuracion/gestionar` además de `mesas/gestionar`:

- `POST /api/salon/zonas`: `nombre`, `aforo_maximo`.
- `PATCH /api/salon/zonas/:id`: esos campos y `revision`.
- `DELETE /api/salon/zonas/:id`: `revision`, únicamente zona vacía.
- `POST /api/salon/mesas`: `zona_id`, `codigo_mesa`, `capacidad_sillas`,
  `posicion_x`, `posicion_y`, `habilitada`.
- `PATCH /api/salon/mesas/:id`: esos campos y `revision`.

No se aceptan mesero asignado ni estado operativo arbitrarios del cliente.
Ocupar/liberar/limpiar continúan usando los comandos existentes.

Backend: `salon-configuracion.js`, `salon.service.js`, rutas/mensajes comerciales.
Frontend: `pages/Salon.jsx`, `FormularioSalon.jsx`, servicio de salón y CSS propio.

## Pruebas

```powershell
# backend
npm.cmd run test:salon:configuracion
npm.cmd run test:salon:configuracion:integracion
npm.cmd run test:salon:integracion
# frontend
npm.cmd run test:salon:configuracion:navegador
npm.cmd run test:salon:navegador
npm.cmd run lint
npm.cmd run build
```

MySQL con rollback/limpieza: permisos, CSRF, altas/ediciones, duplicados, aforo,
revisiones, ocupadas/por limpiar/cuenta activa, reubicación e historia conservada.
Navegador con API interceptada: zonas/mesas, borrado de zona vacía, respuesta
perdida sin duplicados, controles ocultos al mesero y responsive 320–1920 px en
temas claro/oscuro. No necesita las credenciales reales del usuario.
