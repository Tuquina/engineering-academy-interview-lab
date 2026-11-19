# Engineering Academy — Interview Lab

Plataforma personal para aprender, practicar y prepararse para entrevistas técnicas de **Full Stack AI Platform
Engineering**: TypeScript, Node.js, React, Next.js, arquitectura, System Design, PostgreSQL, Redis y agentes LLM.

- Especificación completa: [docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md)
- Arquitectura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Decisiones: [docs/adr/](docs/adr/)
- Estado por fase (implementado y pendiente): [docs/STATUS.md](docs/STATUS.md)
- Cómo agregar un curso o una lección: [docs/guides/adding-a-course.md](docs/guides/adding-a-course.md)

## Requisitos

Sólo **Docker** (con Docker Compose). No hace falta instalar Node.js ni pnpm en el equipo: todo el toolchain corre en
contenedores ([ADR-0001](docs/adr/0001-docker-only-local-toolchain.md)).

No hay variables de entorno obligatorias: todo funciona sin servicios externos (modo invitado con progreso en
`localStorage`) y el AI Agents Lab usa un proveedor local determinista que no necesita API key.

### Modelo real opcional (AI Agents Lab y AI Study Mentor)

Para usar un LLM real, copiá `.env.example` como `.env` (está en `.gitignore`), completá `ANTHROPIC_API_KEY` y
reiniciá el contenedor (`docker compose up app`). La key sólo la lee el servidor: el navegador llama a Route Handlers
propios (`/api/agent-lab/*`, `/api/mentor`), protegidos con límite por minuto, presupuesto diario, mismo origen y
validación de tamaño. Sin key, esas funciones se muestran deshabilitadas y explican cómo activarlas
([ADR-0009](docs/adr/0009-agent-lab-providers-and-evals.md)).

## Uso local

```bash
docker compose up app
```

Abre el servidor de desarrollo en <http://localhost:3000>. La primera vez instala dependencias en un volumen Docker.
Los cambios en `src/` y `content/` se reflejan solos (con polling, unos segundos de demora).

Comandos del proyecto (siempre dentro del contenedor):

```bash
docker compose run --rm app pnpm check          # typecheck + lint + tests + build
docker compose run --rm app pnpm test           # tests unitarios, de componentes y de integridad de contenido
docker compose run --rm app pnpm format         # Prettier
docker compose --profile e2e run --rm e2e       # E2E con Playwright contra un build de producción
docker compose --profile e2e down               # detiene el servidor usado por los E2E
```

Para agregar una dependencia: `docker compose run --rm app pnpm add <paquete>@<versión>`.

## Estructura

```
src/app/                    rutas de Next.js (adaptadores delgados y composición)
src/modules/<módulo>/       domain · application · infrastructure · presentation
src/infrastructure/         raíces de composición (qué adaptador concreto se usa)
src/shared/                 UI, layout y utilidades realmente compartidas
content/                    áreas, cursos, lecciones MDX y rutas de aprendizaje
tests/                      integridad de contenido, reglas de arquitectura y E2E
docs/                       especificación, arquitectura, ADRs y guías
```

## Calidad

| Verificación         | Qué cubre                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `tsc` estricto       | `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`                          |
| ESLint               | reglas de Next.js (core web vitals), TypeScript y accesibilidad                       |
| Vitest               | dominio (catálogo, progreso), adaptadores, componentes, integridad del contenido real |
| Test de arquitectura | dependencias entre capas (`tests/architecture/dependency-rules.test.ts`)              |
| Playwright           | flujo de aprendizaje completo en escritorio y móvil                                   |

## Despliegue

Pendiente para la última fase (Vercel). El proyecto ya es un único Next.js sin procesos persistentes y con las páginas
de contenido pre-generadas, compatible con Vercel Functions.
