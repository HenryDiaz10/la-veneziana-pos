# Frontend · La Veneziana

Interfaz con React, React Router, Vite, Zustand y estilos compartidos.
Incluye las pantallas de administración, atención, caja y cocina según el perfil.

Desde esta carpeta, con dependencias y configuración preparadas:

```powershell
npm.cmd run dev
```

Abrir **http://localhost:5173**. Vite reenvía `/api` y WebSocket al backend
local en `127.0.0.1:3000`. La variable pública de ejemplo es `VITE_API_URL=/api`.
Preparación completa: [inicio rápido](../docs/guias/INICIO_RAPIDO.md).

```powershell
npm.cmd run lint
npm.cmd run build
```

| Interfaz | Guía |
|---|---|
| Perfiles y navegación | [Accesos por perfil](../docs/seguridad/PERFILES_ACCESO.md) |
| Pedidos del mesero, POS y ticket/PDF | [Operación del POS](../docs/operacion/POS.md) |
| Pagos y confirmación | [Pagos](../docs/operacion/PAGOS.md), [venta final](../docs/operacion/VENTA_FINAL.md) |
| Caja, mesas y clientes | [Arqueo](../docs/operacion/ARQUEO.md), [salón](../docs/operacion/SALON.md), [clientes](../docs/clientes/CRM.md) |
| Cocina | [Tablero KDS](../docs/cocina/KDS_FRONTEND.md) |
| Reportes y ventas de clientes | [Gráficos/PDF](../docs/reportes/REPORTES_FRONTEND.md), [historial](../docs/reportes/HISTORIAL_VENTAS.md) |

[Pruebas unitarias y de navegador](../docs/guias/PRUEBAS.md).
[Carpetas de la interfaz](../docs/guias/ESTRUCTURA.md#frontend).

Las notas detalladas de entregas anteriores se conservan como
[historial del frontend](../docs/historial/FRONTEND.md); el
[índice central](../docs/README.md) conduce a las guías vigentes.
