# Agente de impresión

La implementación actual está en
[`backend/scripts/agente-impresion.mjs`](../backend/scripts/agente-impresion.mjs).
Esta carpeta es una entrada documental; no contiene otro servicio ni otro paquete
que instalar o iniciar.

El agente ejecuta una pasada autenticada, obtiene trabajos propios y prepara
archivos de texto térmico de 58/80 mm. Su modo actual es simulación: no envía
comandos a una ticketera, no corta papel y no abre el cajón. No escucha puertos.

El cajero puede imprimir o guardar PDF directamente desde la web:
[ticket después del cobro](../docs/operacion/POS.md#ticket-después-del-cobro).

Variables de configuración, autenticación y repetición segura:
[agente de ventas](../docs/operacion/VENTA_FINAL.md#impresión-durable-y-agente)
y [copias de cierre](../docs/operacion/CAJA.md#ampliación-fase-32-original-y-copias-del-cierre).
