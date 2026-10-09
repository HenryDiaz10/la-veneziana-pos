# Sistema Pizzería La Veneziana

Aplicación web para administrar pedidos, cocina, inventario,
cobros, caja, clientes y reportes de una pizzería.

## Organización del código

- frontend/: interfaz web para administrador, cajero, mesero y cocinero.
- backend/: API, reglas de negocio, permisos y conexión con MySQL.
- agente-impresion/: conexión con las impresoras del local.

## Documentación

La documentación del sistema se encuentra en ../DOCUMENTACION/.
AVANCES EN CLASE POR SEMANAS contiene material de referencia de clase
y no define los requisitos del sistema.

## Tecnologías principales

- Frontend: React, Vite y Tailwind CSS.
- Backend: Node.js y Express.
- Base de datos: MySQL, con Sequelize y mysql2.

## Estado del proyecto

Fase 1: preparación de la estructura y del repositorio Git.
La aplicación todavía no tiene comandos de instalación o arranque
configurados; se documentarán al implementar los paquetes.

## Archivos y configuración

Las dependencias, los archivos generados y la configuración privada
están excluidos mediante .gitignore.

Los archivos .env.example contienen únicamente ejemplos sin secretos.
Los archivos package-lock.json se conservan en Git para reproducir
las versiones de las dependencias.