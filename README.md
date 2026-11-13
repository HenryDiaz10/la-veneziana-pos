# La Veneziana · Sistema de gestión

Aplicación web para la atención de una pizzería: pedidos, cocina, cobros, caja,
catálogo, recetas, clientes, inventario, compras y reportes administrativos.
Backend con Node.js/Express, MySQL y Sequelize; frontend con React/Vite y Zustand.

**Avance: fase 40 implementada, con mejoras posteriores.** La fase 41, pruebas
integrales de estrés local, continúa planificada; no se declara completada.
[Ver las 40 fases y las mejoras posteriores](docs/historial/FASES.md).

## Empezar

- [Inicio rápido: instalar, encender y entrar a la web](docs/guias/INICIO_RAPIDO.md).
- [Configuración, puertos y diagnóstico](docs/guias/CONFIGURACION.md).
- [Cómo ejecutar las pruebas](docs/guias/PRUEBAS.md).
- [Estructura del proyecto](docs/guias/ESTRUCTURA.md).
- **[Índice de toda la documentación](docs/README.md)**.

Con dependencias y configuración local ya preparadas, abrir dos terminales
desde esta carpeta (`CODIGO`):

```powershell
# Terminal 1
cd backend
npm.cmd run dev
```

```powershell
# Terminal 2
cd frontend
npm.cmd run dev
```

Entrar a **http://localhost:5173**. Backend: `http://127.0.0.1:3000`.
La guía de inicio explica la preparación de una copia nueva y de MySQL.

## Funcionamiento actual

| Perfil | Trabajo principal |
|---|---|
| Administrador | Trabajadores, reportes e historial de ventas, resultados, configuración de salón/cajas y gestión comercial. |
| Mesero | Mesas, toma de pedidos e indicaciones para cocina, consulta de clientes. |
| Cajero | Venta de mostrador, cobro de pedidos, tickets y arqueo de su caja. |
| Cocinero | Preparación y despacho desde el tablero KDS. |

Los accesos se verifican en menú, rutas y servidor. La sesión dura ocho horas
desde el login, incluso sin interacción. El registro de un pedido y su cobro
son operaciones separadas, con recuperación idempotente.

Guías frecuentes: [perfiles](docs/seguridad/PERFILES_ACCESO.md),
[pedidos y POS](docs/operacion/POS.md), [historial de ventas](docs/reportes/HISTORIAL_VENTAS.md),
[clientes](docs/clientes/CRM.md), [reportes y resultados](docs/reportes/ANALITICA_Y_RESULTADOS.md).

Los tickets internos admiten impresión/PDF de 58 y 80 mm por el navegador.
La impresión física con hardware y la emisión fiscal tienen alcances distintos:
[ticket, PDF y agente](docs/operacion/VENTA_FINAL.md#impresión-durable-y-agente).

## Organización y mantenimiento

```text
backend/             API, modelos, migraciones, scripts y pruebas MySQL
frontend/            Interfaz, estilos, estado y pruebas de navegador
agente-impresion/     Entrada documental del agente local
docs/                Guías técnicas agrupadas por tema e historial de fases
scripts/             Comprobaciones generales del repositorio
```

Las guías de negocio se mantienen en `docs/`; los README de backend y frontend
son entradas breves. El material externo de la carpeta hermana `DOCUMENTACION`
(PDF por fase, SQL y referencias visuales) permanece fuera de este repositorio.

```powershell
# Desde CODIGO: comprobar los enlaces locales de la documentación.
npm.cmd run docs:check
```

[Criterios de organización y revisión](docs/ORGANIZACION.md).
