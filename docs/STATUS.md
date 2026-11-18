# Estado del proyecto

Registro explícito de lo implementado y lo pendiente (MASTER_PROMPT §37.18). Se actualiza al cerrar cada fase.

## Fase 1 — Fundaciones · ✅ completada (2026-11-18)

### Implementado y verificado

- Proyecto Next.js 16 (App Router) con TypeScript estricto, Tailwind 4, ESLint, Prettier, Vitest, Testing Library y
  Playwright, todo ejecutado en Docker (sin instalar nada en el host).
- Arquitectura hexagonal en `src/modules/learning` y `src/modules/progress`, con un test que verifica las reglas de
  dependencia entre capas.
- **Motor de contenido:** catálogo Área → Curso → Módulo → Lección → Ruta, leído desde `content/`, validado con Zod
  (frontmatter estricto) y con verificación de integridad (IDs, referencias, ciclos de prerrequisitos).
- **Registro de cursos:** agregar una carpeta en `content/courses/` publica el curso en biblioteca, barra lateral y
  dashboard sin tocar código.
- **Catálogo:** 6 áreas y 9 cursos con su temario por módulo (los temas del MASTER_PROMPT §10–18).
- **Primera ruta:** _Full Stack AI Platform Engineer_ (6 etapas).
- **Primera lección real:** _Runtime vs sistema de tipos: type erasure y tipado estructural_, con comparaciones con C#
  y Java, diagrama de flujo, ejemplos incorrecto/recomendado, casos límite, 3 knowledge checks autocorregibles,
  4 preguntas de entrevista, resumen y referencias oficiales.
- **Lector de lecciones:** tabla de contenidos, navegación anterior/siguiente, resaltado de código claro/oscuro.
- **Progreso en modo invitado:** visitas y lecciones completadas en `localStorage` (validado y versionado).
- **Dashboard básico:** siguiente lección recomendada, ruta activa con progreso, últimas lecciones visitadas y avance
  por curso. Sólo muestra datos que efectivamente se registran.
- **Layout:** sidebar en escritorio, navegación en diálogo accesible en móvil, modo oscuro (principal) y claro.

### Verificación

| Comando                                           | Resultado                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck`                                  | ✅                                                                       |
| `pnpm lint`                                       | ✅                                                                       |
| `pnpm test`                                       | ✅ 42 tests (dominio, adaptadores, componentes, contenido, arquitectura) |
| `pnpm build`                                      | ✅ 16 páginas estáticas                                                  |
| E2E (`docker compose --profile e2e run --rm e2e`) | ✅ 9 tests en escritorio y móvil (1 omitido en móvil a propósito)        |

### Limitaciones conocidas

- El servidor de desarrollo en Docker usa webpack con polling: Turbopack no detecta cambios de forma confiable a través
  del bind mount de Windows ([ADR-0001](adr/0001-docker-only-local-toolchain.md)).
- Las respuestas de los knowledge checks no se guardan todavía (llega con quizzes en la Fase 2).
- La ruta activa está fija en _Full Stack AI Platform Engineer_ hasta que existan preferencias de usuario.
- Las secciones de fases futuras se muestran deshabilitadas en la navegación, con la fase prevista.

## Próximas fases

| Fase                                                                          | Estado    |
| ----------------------------------------------------------------------------- | --------- |
| 2 — Aprendizaje (quiz, flashcards, buscador, notas, bookmarks, diagramas)     | Pendiente |
| 3 — Laboratorios (editor, Sandpack, SQL Playground con PGlite, challenges)    | Pendiente |
| 4 — Arquitectura y entrevistas (System Design Studio, Interview Arena)        | Pendiente |
| 5 — Agentes IA (configuración, tool calling, memoria, evals)                  | Pendiente |
| 6 — Persistencia y administración (PostgreSQL, auth, contenido personalizado) | Pendiente |
| 7 — Producción (CI/CD, Vercel)                                                | Pendiente |

### Contenido pendiente respecto del objetivo inicial (§35)

| Elemento                    | Actual                                 | Objetivo |
| --------------------------- | -------------------------------------- | -------- |
| Lecciones sustantivas       | 1                                      | 40       |
| Challenges                  | 0                                      | 25       |
| Preguntas de evaluación     | 3 (knowledge checks) + 4 de entrevista | 60       |
| Flashcards                  | 0                                      | 30       |
| Diagramas                   | 1                                      | 12       |
| Simuladores o laboratorios  | 0                                      | 5        |
| Escenarios de System Design | 0                                      | 5        |
