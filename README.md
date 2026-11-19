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

No hay variables de entorno obligatorias. `docker compose up web` (o `app`) levanta también **PostgreSQL 17** local (volumen
`pgdata`, expuesto en `127.0.0.1:55432`, usuario y base `eal`) y aplica las migraciones. Sin `DATABASE_URL` (por
ejemplo, en un despliegue sin base) todo sigue funcionando en modo invitado con progreso en `localStorage`. El AI
Agents Lab usa un proveedor local determinista que no necesita API key.

### Cuentas, sincronización y administración

- La **primera cuenta** que se registra en `/login` es la administradora; después el registro queda cerrado salvo
  `AUTH_ALLOW_SIGNUP=true`. También se puede promover con `ADMIN_EMAILS` (separados por comas).
- Con sesión iniciada, progreso, notas, flashcards y laboratorios se sincronizan con PostgreSQL entre navegadores; al
  iniciar sesión se combinan con lo que había como invitado y al cerrar sesión se borran de ese navegador.
- GitHub (opcional): creá una OAuth App con callback `http://localhost:3000/api/auth/github/callback` y completá
  `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` en `.env`; `ADMIN_GITHUB_LOGINS` promueve logins.
- `/admin` permite crear cursos, módulos, lecciones (bloques de texto, código, avisos, diagramas y preguntas) y
  flashcards, con versiones, publicación, importación/exportación JSON y auditoría
  ([ADR-0010](docs/adr/0010-persistence-auth-sync-and-admin.md)).
- Migraciones: `docker compose run --rm app pnpm db:generate` después de cambiar un esquema (`*-tables.ts`), y
  `pnpm db:migrate` (se ejecuta solo al levantar `app`).

### Modelo real opcional (AI Agents Lab y AI Study Mentor)

Para usar un LLM real, copiá `.env.example` como `.env` (está en `.gitignore`), completá `ANTHROPIC_API_KEY` y
reiniciá el contenedor (`docker compose up app`). La key sólo la lee el servidor: el navegador llama a Route Handlers
propios (`/api/agent-lab/*`, `/api/mentor`), protegidos con límite por minuto, presupuesto diario, mismo origen y
validación de tamaño. Sin key, esas funciones se muestran deshabilitadas y explican cómo activarlas
([ADR-0009](docs/adr/0009-agent-lab-providers-and-evals.md)).

## Uso local

```bash
docker compose up web
```

Abre la app en <http://localhost:3000> con el **build de producción**: páginas prerenderizadas que responden en
decenas de milisegundos. La primera vez instala dependencias y compila (alrededor de un minuto); los arranques
siguientes reutilizan el build salvo que haya cambios en el código o el contenido.

Para programar, `docker compose up app` levanta el servidor de desarrollo en <http://localhost:3001>: refleja los
cambios de `src/` y `content/` solos, pero compila cada página al visitarla y es mucho más lento. No sirve para
juzgar la performance.

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
