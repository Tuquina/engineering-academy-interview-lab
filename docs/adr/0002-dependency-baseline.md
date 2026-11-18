# ADR-0002: Línea base de dependencias

- **Estado:** Aceptado — 2026-11-18

## Decisión

| Paquete                   | Versión             | Motivo                                                                                                         |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Next.js                   | 16.4                | Estable vigente; App Router y Turbopack.                                                                       |
| React                     | 19.3                | Requerido por Next 16.                                                                                         |
| TypeScript                | 6.0                 | TS 7.0 existe, pero `typescript-eslint` 8.x soporta `<6.1`. Se reevalúa cuando haya soporte.                   |
| ESLint                    | 9.39                | `eslint-config-next` incluye plugins (`react`, `import`, `jsx-a11y`) que aún no declaran soporte de ESLint 10. |
| Tailwind CSS              | 4.3                 | Configuración CSS-first con tokens en variables.                                                               |
| Zod                       | 4                   | Validación de contenido y contratos.                                                                           |
| next-mdx-remote           | 6 (`/rsc`)          | Compilar MDX del repositorio en Server Components con componentes propios.                                     |
| Shiki (`@shikijs/rehype`) | 4                   | Resaltado en servidor, sin JS en cliente, temas claro/oscuro.                                                  |
| Vitest                    | 5 + Testing Library | Tests unitarios y de componentes.                                                                              |
| Playwright                | 1.65                | E2E, ejecutado en su imagen oficial.                                                                           |

No se instalan todavía Monaco, Sandpack, React Flow, Mermaid, Drizzle, TanStack Query ni Zustand: entran en la fase
que los necesita (YAGNI). shadcn/ui se adopta como **patrón** (componentes propios con `cva` + Radix Slot) en lugar
de generar componentes que no se usan.
