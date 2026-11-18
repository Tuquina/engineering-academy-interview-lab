# Guía: agregar un curso, una lección o una ruta

Agregar contenido **no requiere modificar código**: el catálogo se arma leyendo `content/` y se valida al cargarse.
Si algo está mal (campo faltante, referencia rota, ciclo de prerrequisitos), el build y los tests fallan indicando el
archivo y el problema.

## 1. Crear un curso

1. Elegí un área existente en `content/areas.json` (o agregá una nueva con `id`, `slug`, `title`, `description`, `order`).
2. Creá `content/courses/<carpeta>/course.json`:

```json
{
  "id": "go",
  "slug": "go",
  "title": "Go para backends",
  "description": "Concurrencia con goroutines, channels y diseño de servicios.",
  "areaId": "languages-runtime",
  "difficulty": "intermediate",
  "order": 3,
  "prerequisites": [],
  "tags": ["go", "concurrencia"],
  "modules": [
    {
      "id": "go.concurrency",
      "slug": "concurrencia",
      "title": "Concurrencia",
      "description": "Goroutines, channels y patrones de sincronización.",
      "order": 1,
      "topics": ["Goroutines", "Channels", "select", "Context y cancelación"]
    }
  ]
}
```

Reglas:

- `id` es estable: no lo cambies una vez publicado. Por convención, los IDs de módulos y lecciones llevan el ID del
  curso como prefijo (`go.concurrency`).
- `order` del curso es relativo a su área.
- `topics` es el temario planificado: se muestra aunque todavía no haya lecciones.

El curso aparece automáticamente en la biblioteca, en la barra lateral y en el dashboard.

## 2. Escribir una lección

Creá `content/courses/<carpeta>/lessons/<slug>.mdx`. El nombre del archivo es el slug de la URL.

```mdx
---
id: go.goroutines
moduleId: go.concurrency
title: "Goroutines y el scheduler de Go"
description: "Qué es una goroutine, cómo la planifica el runtime y en qué se diferencia de un thread."
difficulty: intermediate
order: 1
objectives:
  - "Explicar el modelo M:N del scheduler de Go."
prerequisites: []
estimatedMinutes: 30
tags: ["go", "concurrencia"]
version: "1.0.0"
comparesWith: ["csharp", "java"]
references:
  - title: "Effective Go — Concurrency"
    url: "https://go.dev/doc/effective_go#concurrency"
interviewQuestions:
  - question: "¿Qué diferencia hay entre una goroutine y un thread del sistema operativo?"
    keyPoints:
      - "Las goroutines son gestionadas por el runtime y multiplexadas sobre threads."
summary:
  - "Punto clave para repasar."
---

## ¿Qué problema resuelve?

...
```

### Estructura pedagógica esperada (MASTER_PROMPT §9)

El lector genera automáticamente **¿Qué vas a aprender?** (desde `objectives`), **Preguntas de entrevista**,
**Resumen** y **Referencias** (desde el frontmatter). El cuerpo MDX debe cubrir, con encabezados `##`:

1. ¿Qué problema resuelve? (con un caso real)
2. Concepto y fundamentos
3. Representación visual (`<FlowDiagram>`)
4. Ejemplo de código
5. Ejemplo incorrecto y por qué falla
6. Implementación recomendada
7. Casos límite
8. Comparación con alternativas (y con C#/Java cuando aplique)
9. Ejercicio interactivo (`<KnowledgeCheck>`)

El test `tests/content/catalog-content.test.ts` exige un mínimo de secciones, extensión, referencias y preguntas de
entrevista para evitar lecciones de relleno.

### Componentes disponibles en MDX

| Componente                                                                                         | Uso                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `<Callout type="info \| tip \| warning \| danger \| interview" title="...">`                       | Notas, advertencias, errores frecuentes, consejos de entrevista                                      |
| `<FlowDiagram steps={[{ title, detail, tone? }]} caption="..." />`                                 | Flujo paso a paso; `tone`: `default`, `boundary`, `runtime`                                          |
| `<KnowledgeCheck id="<lessonId>.qN" question="..." options={[{ text, correct?, explanation }]} />` | Pregunta autocorregible; el `id` (obligatorio, único, con prefijo de la lección) indexa el historial |
| `<MermaidDiagram chart={...} caption="..." />` (el diagrama va en un template literal)             | Diagrama Mermaid (flowchart, sequence, state, er…) con vista ampliada                                |

En los strings de `question`, `text` y `explanation`, el texto entre backticks se muestra como código.
Los bloques de código se resaltan con Shiki (`ts`, `tsx`, `js`, `json`, `csharp`, `java`, `bash`, `sql`, `text`).
Para agregar un componente nuevo, registralo en `src/modules/learning/presentation/mdx/render-lesson-body.tsx`.

> Atención: en MDX, `<` y `{` en texto normal se interpretan como JSX. Escribí tipos como `Promise<T>` entre backticks.

## 3. Crear o extender una ruta

Las rutas viven en `content/paths/*.json`. Cada etapa tiene `items` que pueden ser:

- `{ "kind": "lesson", "lessonId": "..." }`: una lección concreta.
- `{ "kind": "course", "courseId": "..." }`: un curso completo; se expande a todas sus lecciones publicadas, por lo
  que la ruta crece sola cuando se agregan lecciones al curso.

## 4. Verificar

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm build
```

## 5. Agregar flashcards

Creá o extendé un mazo en `content/flashcards/<mazo>.json`:

```json
{
  "id": "redis",
  "title": "Redis",
  "description": "Estructuras, expiración y caching.",
  "courseId": "redis",
  "cards": [
    {
      "id": "redis.ttl",
      "front": "¿Qué devuelve `TTL` para una clave sin expiración?",
      "back": "-1. Si la clave no existe devuelve -2.",
      "difficulty": "basic",
      "tags": ["redis"],
      "lessonId": null
    }
  ]
}
```

Los IDs de tarjeta son globales y estables (el historial de repasos se guarda por ID). `lessonId` es opcional y
enlaza a la lección que explica el concepto.

## 6. Agregar una cheatsheet

Creá `content/cheatsheets/<slug>.mdx` con frontmatter `title`, `description`, `order`, `tags` y `relatedLessons`
(IDs de lecciones existentes). El cuerpo admite los mismos componentes MDX que las lecciones.
