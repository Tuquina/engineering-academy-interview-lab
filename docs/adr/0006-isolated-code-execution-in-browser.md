# ADR-0006: Ejecución de código del usuario aislada en el navegador

- **Estado:** Aceptado — 2026-11-18

## Contexto

La Fase 3 ejecuta código escrito por el usuario: TypeScript (challenges y playground), componentes React con sus
tests y consultas SQL. El MASTER_PROMPT prohíbe ejecutar código o SQL del usuario en el servidor, y el objetivo es que
todo funcione en local sin servicios externos (salvo donde se indique).

## Decisión

### TypeScript: Web Worker efímero

- Monaco (0.57, **auto-hospedado** en `/monaco/vs`, copiado desde `node_modules` por `scripts/copy-monaco.mjs`) da
  edición y chequeo de tipos. Su servicio de TypeScript emite el JavaScript (CommonJS) que se ejecuta.
- Cada ejecución crea un **Web Worker nuevo** (`code-runner.worker.ts`) que se termina al final o al superar 15 s, lo
  que corta bucles infinitos sin congelar la página.
- Dentro del worker se bloquean `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts` e
  `indexedDB`. El evaluador CommonJS (`module-evaluator.ts`) expone un `require` restringido que sólo resuelve
  `./solution`.
- El harness de tests (`test-harness.ts`) es dominio puro y se usa igual en el worker y en Vitest: las soluciones de
  referencia se verifican en CI con el mismo código que corrige al usuario.

### SQL: PGlite en un Web Worker

- PostgreSQL compilado a WebAssembly (`@electric-sql/pglite` 0.5) corre en `sql.worker.ts`, con el dataset cargado al
  iniciar. Timeout de 10 s: si se supera, el worker se reinicia.
- La corrección ejecuta la consulta del usuario y la de referencia dentro de transacciones con `ROLLBACK`, y compara
  resultados (modo `result`) o el estado posterior (modo `state`).

### React: Sandpack

- `@codesandbox/sandpack-react` 2.20 con dos proveedores: uno para la vista previa (`react-ts`) y otro, recreado al
  pulsar "Ejecutar tests", para Jest (`test-ts`). Todo corre en iframes de otro origen.
- **Requiere internet** (usa el bundler de CodeSandbox) y un **contexto seguro** (`crypto.subtle`): `localhost` o
  HTTPS. Se avisa en la interfaz.

## Alternativas consideradas

- **Ejecutar en el servidor (Node `vm`, contenedores):** descartado por el MASTER_PROMPT y por los límites de Vercel
  Functions. Un sandbox de Node real (procesos, `fs`) queda para una fase posterior con un servicio aislado.
- **`eval` en el hilo principal:** no permite cortar bucles infinitos ni aislar la red.
- **Monaco desde CDN:** depende de internet y de un tercero; el auto-hospedaje funciona offline.
- **Sandpack auto-hospedado:** requiere desplegar el bundler; se reevalúa si la dependencia de internet molesta.

## Consecuencias

- El código del usuario nunca llega al servidor. Los tests ocultos viajan al cliente: son "ocultos" para no
  condicionar la solución, no secretos.
- El Laboratorio de código, los challenges de código y el Database Lab funcionan **sin conexión**. Los challenges de
  React no.
- No hay APIs de Node reales (`fs`, `process`, `child_process`) en el sandbox de TypeScript.
- Next.js en desarrollo (webpack) necesita ignorar los imports `node:` que PGlite referencia sólo en Node
  (`next.config.ts`).
