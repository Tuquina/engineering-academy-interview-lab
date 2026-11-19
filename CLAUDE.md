# Engineering Academy — Interview Lab

## Especificación del proyecto

La especificación completa (producto, arquitectura, contenido, plan por fases y criterios de aceptación) está en
[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md). Es la fuente de verdad: leela antes de planificar o implementar cualquier cosa.

Documentos de trabajo:

- [docs/STATUS.md](docs/STATUS.md): qué está implementado, verificado y pendiente por fase.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/adr/](docs/adr/): arquitectura y decisiones.
- [docs/guides/adding-a-course.md](docs/guides/adding-a-course.md): cómo agregar contenido.
- [docs/guides/adding-exercises.md](docs/guides/adding-exercises.md): cómo agregar challenges, ejercicios SQL y
  ejemplos del playground.
- [docs/guides/adding-architecture-content.md](docs/guides/adding-architecture-content.md): cómo agregar patrones, diagramas,
  desafíos de arquitectura y preguntas del Interview Arena.

## Entorno: sólo Docker

No hay Node.js en el host y no se debe instalar nada en la PC. Todo comando corre en el contenedor:

```bash
docker compose up app                          # PostgreSQL + migraciones + dev server en http://localhost:3000
docker compose run --rm app pnpm check         # typecheck + lint + test + build
docker compose --profile e2e run --rm e2e      # Playwright contra build de producción
```

No correr `pnpm build` en el contenedor mientras `app` está levantado: comparten el volumen `.next`.

## Reglas clave (resumen; el detalle está en el master prompt)

- Stack: Next.js App Router + React + TypeScript estricto + Tailwind + componentes propios estilo shadcn; Route Handlers
  en Vercel Functions; PostgreSQL 17 local en Docker con Drizzle (migraciones en `drizzle/`, tests con PGlite); pnpm; Vitest + RTL + Playwright.
- Arquitectura hexagonal y modular en `src/modules/<módulo>/{domain,application,infrastructure,presentation}`.
  Dependencias hacia el dominio; Route Handlers delgados; casos de uso testeables sin Next.js. Composición en
  `src/infrastructure/composition`.
- Idioma: contenido y JSDoc/TSDoc en español; identificadores, endpoints y nombres técnicos en inglés.
- Nunca presentar simulaciones como reales, no inventar resultados de tests, no ejecutar código ni SQL del usuario en el
  servidor, no dejar botones decorativos (las funciones futuras se muestran deshabilitadas con su fase).
- Priorizar vertical slices funcionales; evitar sobreingeniería y archivos vacíos.

## Estado del proyecto

- Fase 1 — Fundaciones: **completada**.
- Fase 2 — Aprendizaje: **completada** (ver docs/STATUS.md).
- Fase 3 — Laboratorios: **completada** (ver docs/STATUS.md y docs/adr/0006).
- Fase 4 — Arquitectura y entrevistas: **completada** (ver docs/STATUS.md y docs/adr/0007).
- Fase 4.5 — Teoría de los cursos: **completada** (agregada por el usuario; 60 lecciones en 9 cursos; ver docs/adr/0008).
- Fase 5 — Agentes IA: **completada** (AI Agents Lab, evals y AI Study Mentor opcional; ver docs/adr/0009).
- Fase 6 — Persistencia y administración: **completada** (PostgreSQL local, cuentas, sincronización, administración de
  contenido; ver docs/adr/0010).
- Siguiente: **Fase 7 — Producción** (último paso: despliegue en Vercel).
