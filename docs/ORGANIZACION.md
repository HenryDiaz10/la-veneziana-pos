# Organización de la documentación

Revisión del 13/11/2026. Alcance: Markdown del repositorio `CODIGO`.

## Qué se encontró y qué cambió

- Había 32 documentos distribuidos entre raíz, backend y frontend. Los dos
  README extensos mezclaban evolución histórica, instrucciones de ejecución y
  pendientes de fases ya implementadas.
- No se encontraron archivos Markdown idénticos por contenido. Documentos como
  Recetas/Recetario o KDS backend/frontend son complementarios, no duplicados.
- Las guías se trasladaron a carpetas temáticas de `docs/`. Se conserva un
  README breve en raíz y en cada aplicación, y una entrada para el agente.
- El antiguo README general y el del frontend se conservaron en `historial`,
  identificados como registros de desarrollo. Se extrajo una cronología de
  las fases 1 a 40; los pendientes antiguos no definen el estado actual.
- Se añadieron las guías generales que faltaban: inicio rápido, configuración/
  puertos/diagnóstico, pruebas, estructura y un resumen localizable de seguridad.
- Se actualizaron enlaces y se corrigieron indicaciones desactualizadas sobre
  permisos, toma de pedidos, impresión/PDF y secciones retiradas.

## Dónde escribir un cambio nuevo

1. Actualizar la guía temática correspondiente; su índice está en [docs/README](README.md).
2. Si cambia el arranque o las variables, actualizar también las guías generales.
3. Añadir una nota breve de avance en [fases](historial/FASES.md) cuando cambie
   una etapa; mantener corto el README raíz.
4. Documentar el alcance de pruebas y las limitaciones verificadas. No convertir
   estimaciones o simulaciones en afirmaciones de operación física/fiscal.
5. Ejecutar desde `CODIGO`: `npm.cmd run docs:check`.

Los comandos de las guías heredadas indican si parten de backend, frontend o
CODIGO. Mover un documento no mueve el código citado por él ni cambia su directorio
de trabajo. Los enlaces Markdown se resuelven desde el archivo que los contiene.

## Nombres y niveles de documentación

- Guías por tema: nombres descriptivos; se conservaron los nombres existentes.
  Los archivos KDS/REPORTES llevan sufijo BACKEND o FRONTEND para distinguir capas.
- README de aplicación: arranque mínimo y enlaces, sin copiar toda la historia.
- Historial: decisiones y entregas de su fecha, claramente identificadas.
- PDF de una fase o mejora: permanece en la carpeta externa `DOCUMENTACION/FASES`.
  El repositorio no incorpora automáticamente ese material ni lo modifica al mover Markdown.

## Verificación de enlaces

El script [verificar-documentacion.mjs](../scripts/verificar-documentacion.mjs)
comprueba destinos locales, anclas y accesibilidad de documentos desde los índices.
Excluye dependencias, `.git` y archivos generados; ignora bloques de código y
URLs externas. No necesita paquetes adicionales, Vite, MySQL o acceso a Internet.
