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

## 3. Módulos (estado en Fase 1)

| Módulo                                                                                                               | Estado               | Responsabilidad                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `learning`                                                                                                           | Implementado         | Catálogo (áreas, cursos, módulos, lecciones, rutas), integridad, lectura de lecciones MDX. |
| `progress`                                                                                                           | Implementado (local) | Progreso por lección en modo invitado (`localStorage`). PostgreSQL en Fase 6.              |
| `exercises`, `challenges`, `interviews`, `flashcards`, `architecture-lab`, `agent-lab`, `content-management`, `auth` | Planificados         | Se crean cuando una fase los necesita; no existen carpetas vacías.                         |

## 4. Modelo de contenido

Jerarquía: **Área → Curso → Módulo → Lección** (ejercicios y evaluaciones se suman en las fases 2–3).

```
content/
  areas.json                         # áreas de conocimiento
  courses/<curso>/course.json        # metadatos del curso + módulos (con temario)
  courses/<curso>/lessons/*.mdx      # lecciones: frontmatter validado con Zod + cuerpo MDX
  paths/*.json                       # rutas de aprendizaje (etapas que referencian lecciones o cursos)
```

- El curso de una lección se deduce de su carpeta; el área, del curso.
- Los IDs son estables (`typescript.runtime-vs-type-system`); el progreso se guarda por ID, no por slug.
- Una ruta puede referenciar un **curso completo**: al agregar lecciones al curso, la ruta las incorpora sola.
- `Catalog.create()` valida integridad (IDs duplicados, referencias rotas, ciclos de prerrequisitos) y falla rápido.
- Agregar un curso = agregar una carpeta. Aparece en la biblioteca y en la navegación sin tocar código.
  Ver [guides/adding-a-course.md](guides/adding-a-course.md).

El MDX del repositorio es contenido confiable y se compila en el servidor (`next-mdx-remote/rsc`) con un conjunto
cerrado de componentes. El contenido creado por usuarios (Fase 6) **no** se ejecutará como MDX: se guardará como
datos estructurados y se renderizará con componentes controlados.

## 5. Entorno local

Todo el toolchain corre en Docker (ver [ADR-0001](adr/0001-docker-only-local-toolchain.md)):

```bash
docker compose up app                        # http://localhost:3000
docker compose run --rm app pnpm check       # typecheck + lint + tests + build
docker compose --profile e2e run --rm e2e    # Playwright contra el contenedor app
```

## 6. Riesgos técnicos identificados

| Riesgo                                                                     | Mitigación                                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Watchers poco fiables sobre bind mounts desde Windows                      | Polling en `compose.yaml`; `node_modules` y `.next` en volúmenes Linux.                       |
| Ejecución de código del usuario (Fase 3+)                                  | Nunca en el proceso de Next.js: Sandpack/PGlite en navegador, sandbox aislado para Node real. |
| Límites de Vercel Functions (duración, memoria, sin procesos persistentes) | Contenido pre-generado; trabajos pesados vía adaptadores a servicios externos.                |
| El crecimiento del catálogo rompe referencias                              | Validación en `Catalog.create()` + test que carga el contenido real.                          |
| TypeScript 7 aún no soportado por `typescript-eslint`                      | Se fija TypeScript 6.0 ([ADR-0002](adr/0002-dependency-baseline.md)).                         |
| El progreso local se pierde al limpiar el navegador                        | Explícito en la UI; sincronización con cuenta en Fase 6.                                      |
