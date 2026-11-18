# ADR-0001: Toolchain local exclusivamente en Docker

- **Estado:** Aceptado — 2026-11-18

## Contexto

La máquina de desarrollo no tiene Node.js y no se desea instalar software en el host. Sí dispone de Docker.

## Decisión

- Imagen de desarrollo `docker/dev.Dockerfile` basada en `node:26.13.1-bookworm-slim` con `pnpm@12.21.0` fijo
  (Node ≥ 25 ya no incluye corepack).
- `compose.yaml` define `app` (servidor de desarrollo y comandos puntuales) y `e2e` (imagen oficial de Playwright,
  perfil opcional). Servicios como PostgreSQL se agregan cuando una fase los necesite.
- `node_modules` y `.next` viven en volúmenes nombrados para no mezclar binarios nativos de Windows y Linux ni sufrir
  la E/S lenta del bind mount. El watcher usa polling.

- El servidor de desarrollo en Docker usa **webpack** (`pnpm dev:docker` → `next dev --webpack`) con
  `WATCHPACK_POLLING`. Se verificó que Turbopack, incluso con `watchOptions.pollIntervalMs`, no detectaba de forma
  confiable los cambios a través del bind mount de Windows, mientras que webpack con polling los refleja en ~3 s.
  El build de producción sigue usando Turbopack (`next build`).

## Consecuencias

- Todo comando del proyecto se ejecuta como `docker compose run --rm app pnpm <script>`.
- El editor del host no ve `node_modules` (autocompletado de tipos limitado fuera del contenedor). Alternativa futura:
  Dev Containers.
- El despliegue en Vercel no depende de Docker: Vercel construye con su propio runtime.
