# Backend · La Veneziana

API con Express, Sequelize/MySQL, autenticación y permisos, servicios
transaccionales, auditoría, idempotencia y eventos de cocina.

Desde esta carpeta, con configuración local y dependencias preparadas:

```powershell
npm.cmd run dev
```

El ejemplo utiliza `127.0.0.1:3000`; `/health` verifica el proceso y `/ready`
comprueba MySQL. Para una instalación nueva, seguir el
[inicio rápido](../docs/guias/INICIO_RAPIDO.md) y la
[configuración](../docs/guias/CONFIGURACION.md).

| Necesito consultar | Guía |
|---|---|
| Sesiones, autenticación y roles | [Seguridad](../docs/seguridad/SEGURIDAD.md) |
| Catálogo y recetas | [Catálogo](../docs/catalogo/CATALOGO.md), [recetas](../docs/catalogo/RECETAS.md) |
| Inventario y compras | [Inventario](../docs/inventario/INVENTARIO.md), [compras](../docs/inventario/COMPRAS.md) |
| Pedidos, cobros y caja | [Pedidos](../docs/operacion/PEDIDOS.md), [venta](../docs/operacion/VENTA_FINAL.md), [caja](../docs/operacion/CAJA.md) |
| Tablero de cocina | [KDS: API y eventos](../docs/cocina/KDS_BACKEND.md) |
| Reportes e historial | [Reportes](../docs/reportes/REPORTES_BACKEND.md), [historial](../docs/reportes/HISTORIAL_VENTAS.md) |

Los comandos de pruebas están en la [guía de verificación](../docs/guias/PRUEBAS.md).
La documentación completa está en el [índice central](../docs/README.md).
Las guías antes sueltas en esta carpeta fueron reubicadas; el código conserva sus rutas.
