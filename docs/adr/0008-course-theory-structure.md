# ADR-0008: Estructura de los cursos de teoría (Fase 4.5)

- **Estado:** Aceptado — 2026-11-19

## Contexto

Después de la Fase 4 la plataforma tenía todas las herramientas de práctica, pero sólo 3 lecciones escritas en 9
cursos. El usuario pidió una fase dedicada a la teoría: cursos completos que se puedan seguir **desde cero** por
alguien que ya sabe programar (no hace falta explicar qué es un `if`), con una introducción a cada lenguaje o
tecnología antes de los temas importantes para la entrevista.

## Decisión

### Un módulo de introducción por curso

- Cada curso agrega un módulo `<curso>.intro` (slug `introduccion`, `order: 0`). El catálogo ordena las lecciones
  por orden de módulo y luego de lección, así que la introducción queda primera sin cambios de código.
- La introducción responde: **qué es**, **qué problema resuelve**, **cómo se usa** (instalación o ejecución, en
  Docker cuando aplica), **sintaxis básica** con ejemplos pequeños y **el mapa del curso**.
- En los lenguajes (TypeScript) la introducción se divide en dos lecciones: el lenguaje y su ecosistema, y la
  sintaxis esencial de JavaScript moderno explicada a quien viene de C# y Java.

### Una lección por grupo de temas

Los `topics` de cada módulo se agrupan en lecciones coherentes (2 a 4 lecciones por módulo). Cada lección sigue la
estructura de la guía `docs/guides/adding-a-course.md`:

1. Introducción y problema real.
2. Conceptos explicados a fondo, de lo simple a lo complejo.
3. Al menos un diagrama (`MermaidDiagram` o `FlowDiagram`).
4. Ejemplos de código correctos e incorrectos.
5. Comparación con C# y Java cuando aporta (`comparesWith`).
6. Errores frecuentes.
7. Knowledge checks (al menos dos).
8. Preguntas de entrevista y resumen en el frontmatter.

### Verificación

- `tests/content/catalog-content.test.ts` ya exige secciones, extensión, referencias y preguntas de entrevista.
- Se agrega un test que **parsea cada diagrama Mermaid** de las lecciones: un diagrama roto se renderiza en el
  cliente y no lo detectaría el build.
- Cada lección cita documentación oficial en `references`.

### Entregas por tandas

Se commitea por curso o por pares de cursos, en este orden: TypeScript; Node.js; React y Next.js; LLMs y agentes;
PostgreSQL y Redis; Arquitectura y System Design.

## Consecuencias

- Las rutas que incluyen cursos completos crecen solas con cada lección.
- La numeración de las fases siguientes no cambia (Fase 5 sigue siendo Agentes IA).
- El volumen de contenido crece mucho: los tests de contenido son la red de seguridad contra lecciones de relleno o
  diagramas rotos.
