# Documentación de La Veneziana

Este es el índice técnico del repositorio. Las guías se agrupan por tema y el
historial se conserva aparte para distinguir lo vigente de lo entregado en cada fase.

**Fase 40 implementada, con mejoras posteriores; fase 41 planificada.**
[Cronología completa](historial/FASES.md).

## Guías generales

| Guía | Cuándo usarla |
|---|---|
| [Inicio rápido](guias/INICIO_RAPIDO.md) | Preparar una copia, encender servidores y entrar a la web. |
| [Configuración y diagnóstico](guias/CONFIGURACION.md) | Puertos, variables, MySQL, migraciones y errores de conexión. |
| [Pruebas](guias/PRUEBAS.md) | Elegir verificaciones unitarias, MySQL o navegador. |
| [Estructura del proyecto](guias/ESTRUCTURA.md) | Saber qué contiene cada carpeta y dónde hacer un cambio. |
| [Organización de estas guías](ORGANIZACION.md) | Revisar qué se movió, cómo mantener enlaces y qué pertenece al historial. |

## Seguridad y personal

- [Seguridad: autenticación, autorización y auditoría](seguridad/SEGURIDAD.md).
- [Sesiones de ocho horas y desconexiones](seguridad/SESIONES.md).
- [Secciones y permisos efectivos por perfil](seguridad/PERFILES_ACCESO.md).
- [Mis trabajadores](seguridad/TRABAJADORES.md).

## Catálogo, carta y recetas

- [API y administración del catálogo](catalogo/CATALOGO.md).
- [API de recetas, unidades y deltas de modificadores](catalogo/RECETAS.md).
- [Recetario referencial y mermas](catalogo/RECETARIO.md).
- [Carga de la carta y presentaciones de bebidas](catalogo/CARTA.md).

## Inventario y abastecimiento

- [Inventario, reservas, Kardex y monitor](inventario/INVENTARIO.md).
- [Proveedores y compras](inventario/COMPRAS.md).
- [Proveedores de referencia](inventario/PROVEEDORES.md).
- [Abastecimiento inicial y pagos administrativos](inventario/ABASTECIMIENTO_INICIAL.md).

## Clientes

- [Listado administrativo, búsquedas, ficha, direcciones y puntos](clientes/CRM.md).

## Pedidos, salón y caja

| Guía | Responsabilidad |
|---|---|
| [POS y toma de pedidos](operacion/POS.md) | Mesero, borrador, confirmación en el recibo y ticket/PDF. |
| [Carrito](operacion/CARRITO.md) | Estado por empleado, persistencia y cálculo. |
| [API de pedidos](operacion/PEDIDOS.md) | Registro/ampliación, reserva, checkout e idempotencia. |
| [Modificadores y notas](operacion/MODIFICADORES_NOTAS.md) | Opciones, exclusiones e indicaciones hasta cocina y ticket. |
| [Pagos mixtos](operacion/PAGOS.md) | Preparación de medios, efectivo/vuelto y confirmación. |
| [Venta final y recuperación](operacion/VENTA_FINAL.md) | Cobro, respuestas perdidas, ticket y agente. |
| [Caja y devoluciones: backend](operacion/CAJA.md) | Corte Z, movimientos, snapshots y copias. |
| [Arqueo: interfaz](operacion/ARQUEO.md) | Conteo, cierre y consulta de turnos. |
| [Configuración de cajas](operacion/CAJAS_CONFIGURACION.md) | Terminales, cajeros asignados y mantenimiento. |
| [Salón: interfaz](operacion/SALON.md) | Mapa, filtros y detalle de mesas. |
| [Mesas: API operativa](operacion/MESAS.md) | Estados, responsables y cuenta abierta. |
| [Zonas y mesas: configuración](operacion/SALON_CONFIGURACION.md) | Alta y edición administrativa de distribución y aforo. |

## Cocina

- [KDS: API, outbox y WebSocket](cocina/KDS_BACKEND.md).
- [KDS: tablero, avisos y tiempos](cocina/KDS_FRONTEND.md).

## Reportes y ventas

- [Reportes gerenciales y gastos: API](reportes/REPORTES_BACKEND.md).
- [Reportes: interfaz, gráficos y exportación](reportes/REPORTES_FRONTEND.md).
- [Análisis, compras/gastos y estado de resultados](reportes/ANALITICA_Y_RESULTADOS.md).
- [Historial de ventas por cliente](reportes/HISTORIAL_VENTAS.md).

## Historial y material externo

- [Fases 1 a 40 y mejoras posteriores](historial/FASES.md): vista cronológica compacta.
- [Registro general de desarrollo](historial/DESARROLLO.md): antiguo README extenso.
- [Registro del frontend](historial/FRONTEND.md): entregas y decisiones anteriores.

Los PDF de fases, SQL de referencia, carta y pantallas de diseño permanecen en
la carpeta hermana `DOCUMENTACION`, fuera del repositorio `CODIGO`. Los PDF
describen la entrega de su fecha; no se regeneran al mover estas guías.
