# Arquitectura — Engineering Academy: Interview Lab

> Documento vivo. La especificación de producto está en [MASTER_PROMPT.md](MASTER_PROMPT.md); las decisiones puntuales, en [adr/](adr/).

## 1. Vista general

Un único proyecto **Next.js (App Router)** contiene la UI y los endpoints. El código de negocio vive en
**módulos hexagonales** dentro de `src/modules/`, independientes de Next.js, para poder extraerlos a un servicio
Node.js separado sin reescribir dominio ni casos de uso.

```
Navegador ──► src/app (Server Components / Route Handlers: adaptadores delgados)
                 │
                 ├──► src/infrastructure/composition (composición explícita de dependencias)
                 │          │
                 │          ▼
                 │     adaptadores: filesystem (content/), localStorage, PostgreSQL (Fase 6)
                 │          │ implementan puertos de ▼
                 └──► src/modules/<módulo>/application ──► src/modules/<módulo>/domain
```

## 2. Reglas de dependencia

| Capa              | Puede importar                                          | No puede importar                                                                     |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `domain/`         | sólo `domain/` del mismo módulo y `src/shared/kernel`   | React, Next.js, Zod, APIs de Node, `application/`, `infrastructure/`, `presentation/` |
| `application/`    | `domain/` y sus propios puertos                         | `infrastructure/`, `presentation/`, Next.js, React                                    |
| `infrastructure/` | `application/` (puertos), `domain/`, librerías externas | `presentation/`                                                                       |
| `presentation/`   | `application/`, `domain/`, React, `src/shared/ui`       | `infrastructure/` de otros módulos; Next.js server-only APIs                          |
| `src/app/`        | todo: actúa como capa de composición y adaptador HTTP   | —                                                                                     |

Estas reglas se verifican automáticamente en `tests/architecture/dependency-rules.test.ts`.

## 3. Módulos (estado en Fase 6)

| Módulo               | Estado               | Responsabilidad                                                                                   |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `learning`           | Implementado         | Catálogo (áreas, cursos, módulos, lecciones, rutas), integridad, lecciones y cheatsheets MDX.     |
| `progress`           | Implementado (local) | Progreso, respuestas a quizzes, tiempo de estudio, estadísticas y recomendaciones.                |
| `flashcards`         | Implementado (local) | Mazos en `content/flashcards`, repetición espaciada (SM-2 adaptado, ADR-0005).                    |
| `notebook`           | Implementado (local) | Notas por lección, marcadores y cheatsheets favoritas.                                            |
| `preferences`        | Implementado (local) | Tamaño de lectura, ruta activa, tarjetas nuevas por día.                                          |
| `search`             | Implementado         | Índice y búsqueda local (Ctrl/Cmd + K).                                                           |
| `exercises`          | Implementado         | Harness de tests, ejecución de TypeScript en Web Worker, Monaco, intentos y borradores.           |
| `challenges`         | Implementado         | Desafíos de código, React (Sandpack), SQL y diseño con rúbrica; catálogo y filtros.               |
| `sql-lab`            | Implementado         | PostgreSQL (PGlite) en Web Worker, dataset, ejercicios y corrección por resultado o estado.       |
| `architecture`       | Implementado         | Pattern Library, diagramas interactivos (React Flow) y comparador de arquitecturas.               |
| `system-design`      | Implementado (local) | Architecture Canvas, simuladores deterministas y desafíos de arquitectura en 8 fases.             |
| `interviews`         | Implementado (local) | Interview Arena: banco de preguntas, sesiones por modo, autoevaluación y puntos débiles.          |
| `agent-lab`          | Implementado         | AI Agents Lab: configuración versionada, tool calling, memoria, evals y quality gate (ADR-0009).  |
| `mentor`             | Implementado         | AI Study Mentor opcional con proveedor real detrás de Route Handlers.                             |
| `auth`               | Implementado         | Cuentas con email/contraseña y GitHub opcional, sesiones en PostgreSQL y roles (ADR-0010).        |
| `sync`               | Implementado         | Sincronización de los stores del cliente con la cuenta (merge de tres vías) y copia de datos.     |
| `content-management` | Implementado         | Administración de contenido estructurado: cursos, lecciones, versiones, import/export, auditoría. |

## 4. Modelo de contenido

Jerarquía: **Área → Curso → Módulo → Lección** (ejercicios y evaluaciones se suman en las fases 2–3).

```
content/
  areas.json                         # áreas de conocimiento
  courses/<curso>/course.json        # metadatos del curso + módulos (con temario)
  courses/<curso>/lessons/*.mdx      # lecciones: frontmatter validado con Zod + cuerpo MDX
  paths/*.json                       # rutas de aprendizaje (etapas que referencian lecciones o cursos)
  challenges/<slug>/                 # challenge.mdx + starter/tests/hidden-tests/solution (Fase 3)
  sql/dataset.sql, sql/exercises/*.md  # dataset del Database Lab y ejercicios SQL
  playground/*.ts                    # ejemplos del Laboratorio de código
  architecture/patterns/*.mdx        # Pattern Library (Fase 4)
  architecture/diagrams/*.json       # diagramas interactivos
  architecture/architectures.json    # perfiles del comparador
  system-design/challenges/<slug>/   # desafíos de arquitectura (challenge.mdx + solution.mdx)
  interview/questions/<área>/*.md    # banco del Interview Arena
```

Formato de challenges y ejercicios: [guides/adding-exercises.md](guides/adding-exercises.md). La ejecución de código
del usuario ocurre siempre en el navegador, aislada en Web Workers o iframes
([ADR-0006](adr/0006-isolated-code-execution-in-browser.md)). El contenido de arquitectura y entrevistas se
describe en [guides/adding-architecture-content.md](guides/adding-architecture-content.md) y sus decisiones en
[ADR-0007](adr/0007-architecture-studio-and-interview-arena.md).

- El curso de una lección se deduce de su carpeta; el área, del curso.
- Los IDs son estables (`typescript.runtime-vs-type-system`); el progreso se guarda por ID, no por slug.
- Una ruta puede referenciar un **curso completo**: al agregar lecciones al curso, la ruta las incorpora sola.
- `Catalog.create()` valida integridad (IDs duplicados, referencias rotas, ciclos de prerrequisitos) y falla rápido.
- Agregar un curso = agregar una carpeta. Aparece en la biblioteca y en la navegación sin tocar código.
  Ver [guides/adding-a-course.md](guides/adding-a-course.md).

El MDX del repositorio es contenido confiable y se compila en el servidor (`next-mdx-remote/rsc`) con un conjunto
cerrado de componentes. El contenido creado desde la administración (Fase 6) **no** se ejecuta como MDX: se guarda en PostgreSQL como
bloques estructurados y se renderiza con componentes controlados en `/c/[curso]/[lección]` (ADR-0010).

## 5. Entorno local

Todo el toolchain corre en Docker (ver [ADR-0001](adr/0001-docker-only-local-toolchain.md)):

```bash
docker compose up web                        # build de producción en http://localhost:3000 (para usarla)
docker compose up app                        # servidor de desarrollo en http://localhost:3001 (para programar)
docker compose run --rm app pnpm check       # typecheck + lint + tests + build
docker compose --profile e2e run --rm e2e    # Playwright contra un build de producción
```

## 6. Riesgos técnicos identificados

| Riesgo                                                                     | Mitigación                                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Watchers poco fiables sobre bind mounts desde Windows                      | Polling en `compose.yaml`; `node_modules` y `.next` en volúmenes Linux.                       |
| Ejecución de código del usuario (Fase 3+)                                  | Nunca en el proceso de Next.js: Sandpack/PGlite en navegador, sandbox aislado para Node real. |
| Límites de Vercel Functions (duración, memoria, sin procesos persistentes) | Contenido pre-generado; trabajos pesados vía adaptadores a servicios externos.                |
| El crecimiento del catálogo rompe referencias                              | Validación en `Catalog.create()` + test que carga el contenido real.                          |
| TypeScript 7 aún no soportado por `typescript-eslint`                      | Se fija TypeScript 6.0 ([ADR-0002](adr/0002-dependency-baseline.md)).                         |
| El progreso local se pierde al limpiar el navegador                        | Con cuenta se sincroniza en PostgreSQL; sin cuenta, copia de seguridad exportable.            |

## 7. Estado de cliente (local y sincronizado)

Todo el estado de usuario usa el puerto `ExternalStore<T>` (`src/shared/kernel/external-store.ts`), consumido con
`useSyncExternalStore`. La implementación actual es `LocalStorageStore<T>` (`src/infrastructure/browser`), que valida
con Zod, migra versiones y sincroniza pestañas. La raíz de composición `src/infrastructure/composition/client-stores.ts`
decide la implementación. Desde la Fase 6 cada store se envuelve en un `SyncedStore` que, con sesión iniciada, lo
replica en PostgreSQL (`/api/sync`, ADR-0010) sin cambiar los componentes; `localStorage` sigue siendo la caché local
y guarda en `eal:sync:<store>` la revisión y el ancestro común para el merge de tres vías.

| Clave local       | Módulo        | Contenido                                                       |
| ----------------- | ------------- | --------------------------------------------------------------- |
| `eal:progress`    | progress      | Lecciones (v2), respuestas a knowledge checks, segundos por día |
| `eal:flashcards`  | flashcards    | Planificación SM-2 por tarjeta y repasos por día                |
| `eal:notebook`    | notebook      | Notas, marcadores y cheatsheets favoritas                       |
| `eal:preferences` | preferences   | Tamaño de lectura, ruta activa, tarjetas nuevas por día         |
| `eal:practice`    | exercises     | Intentos, borradores, respuestas de diseño y soluciones vistas  |
| `eal:studio`      | system-design | Diagramas del canvas y trabajo de los desafíos de arquitectura  |
| `eal:interviews`  | interviews    | Sesiones del Interview Arena y puntos débiles por pregunta      |
| `eal:agent-lab`   | agent-lab     | Agentes, versiones, casos propios, quality gate y evaluaciones  |
| `eal:sync:*`      | sync          | Revisión y ancestro común de cada store sincronizado            |
| `eal:theme`       | shared        | Tema claro/oscuro (aplicado antes del primer pintado)           |
