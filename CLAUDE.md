# Engineering Academy — Interview Lab

## Especificación del proyecto

La especificación completa (producto, arquitectura, contenido, plan por fases y criterios de aceptación) está en
[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md). Es la fuente de verdad: leela antes de planificar o implementar cualquier cosa.

## Reglas clave (resumen; el detalle está en el master prompt)

- Stack: Next.js App Router + React + TypeScript estricto + Tailwind + shadcn/ui; Route Handlers en Vercel Functions; PostgreSQL con un único ORM (Drizzle preferido); pnpm; Vitest + RTL + Playwright.
- Arquitectura hexagonal y modular en `src/modules/<módulo>/{domain,application,infrastructure,presentation}`. Dependencias hacia el dominio; Route Handlers delgados; casos de uso testeables sin Next.js.
- Idioma: contenido y JSDoc/TSDoc en español; identificadores, endpoints y nombres técnicos en inglés.
- Nunca presentar simulaciones como reales, no inventar resultados de tests, no ejecutar código ni SQL del usuario en el servidor de producción, no dejar botones decorativos.
- Priorizar vertical slices funcionales; evitar sobreingeniería y archivos vacíos.

## Estado del proyecto

- Fase actual: **Fase 1 — Fundaciones** (sin iniciar).
- El avance por fase se registra en la sección 36 de `docs/MASTER_PROMPT.md` (checkboxes) y las decisiones en `docs/adr/`.
