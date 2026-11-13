# Pruebas y comprobaciones

Elegir las verificaciones según el cambio. Los siguientes comandos son ejemplos
existentes; el catálogo completo de scripts está en los `package.json` de
[backend](../../backend/package.json) y [frontend](../../frontend/package.json).

## Documentación

Desde `CODIGO`, sin iniciar MySQL ni Vite:

```powershell
npm.cmd run docs:check
npm.cmd run docs:test
```

Comprueba archivos y carpetas de enlaces Markdown locales, anclas y documentos
sin enlace desde los índices. No consulta sitios externos ni abre archivos privados.

## Frontend: calidad y reglas puras

Desde `frontend`:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:carrito
npm.cmd run test:pos
npm.cmd run test:pagos
node --test tests/accesos-perfiles.test.mjs
```

Lint revisa código; build valida la compilación. Las pruebas de cálculo no
sustituyen la comprobación visual de laptop, celular, foco o impresión.

## Backend: reglas e integración

Desde `backend`, reglas puras disponibles:

```powershell
npm.cmd run test:recetas
npm.cmd run test:inventario
npm.cmd run test:pedidos
npm.cmd run test:caja
```

Las pruebas de integración necesitan MySQL local configurado y el esquema
preparado. Crean fixtures y aplican limpieza o rollback según la prueba.
No se deben ejecutar contra los datos de producción.

```powershell
npm.cmd run test:pos:integracion
node tests/clientes-listado-integracion.mjs
node tests/historial-ventas-integracion.mjs
npm.cmd run test:trabajadores:integracion
npm.cmd run test:reportes:integracion
```

Algunas pruebas levantan su servidor en un puerto efímero y gestionan sus propias
sesiones. No cambiar credenciales ni desactivar permisos para hacerlas pasar.
Cada guía de módulo explica fixtures, concurrencia e idempotencia que comprueba.

## Navegador

Las pruebas `.mjs` de navegador usan Playwright y Microsoft Edge. La ruta al
módulo Playwright se puede pasar como primer argumento; varias conservan por
defecto la ruta del entorno original. Encender Vite en otra terminal. Las pruebas
interceptan API con datos de prueba y no usan la cuenta real del administrador.

Desde `frontend`, sustituir la ruta entre comillas por la instalación disponible:

```powershell
node tests/perfiles-navegador.mjs '<ruta-a-playwright/index.mjs>'
node tests/mesero-pedido-navegador.mjs '<ruta-a-playwright/index.mjs>'
node tests/clientes-listado-navegador.mjs '<ruta-a-playwright/index.mjs>'
node tests/historial-ventas-navegador.mjs '<ruta-a-playwright/index.mjs>'
```

Estas pruebas admiten `TEST_BASE_URL` para apuntar a otro Vite local. Otras
pruebas antiguas siguen fijadas al puerto 5173: comprobar su encabezado antes
de ejecutarlas con otro puerto.

Los PDF de prueba, capturas y archivos temporales no son documentación de una
nueva fase. Guardarlos fuera de las carpetas de código. Imprimir un PDF de prueba
no demuestra que una ticketera física imprimió papel; revisar hardware por separado.
