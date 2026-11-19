# Cómo agregar patrones, diagramas, desafíos de arquitectura y preguntas de entrevista

Todo vive en `content/` y se valida al construir. Después de cualquier cambio:

```bash
docker compose run --rm app pnpm check
```

`tests/content/architecture-content.test.ts` verifica secciones obligatorias, referencias cruzadas y cobertura
mínima; `pnpm build` compila todo el MDX.

## 1. Patrones (`content/architecture/patterns/<slug>.mdx`)

El slug sale del nombre del archivo (no puede ser `compare` ni `diagrams`). Frontmatter:

| Campo                    | Contenido                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | `pattern.<slug>`                                                                                                                            |
| `kind`                   | `design` · `architecture`                                                                                                                   |
| `category`               | `creational` · `structural` · `behavioral` · `data-access` · `application-architecture` · `distributed-data` · `resilience` · `integration` |
| `title`, `summary`       | texto                                                                                                                                       |
| `difficulty`, `order`    | como en los challenges                                                                                                                      |
| `definition`, `problem`  | párrafos                                                                                                                                    |
| `benefits`, `costs`      | listas (mínimo 2)                                                                                                                           |
| `alternatives`           | `[{ name, when }]`                                                                                                                          |
| `commonMistakes`         | lista (mínimo 2)                                                                                                                            |
| `avoidWhen`              | lista                                                                                                                                       |
| `interviewQuestions`     | `[{ question, answer }]` (mínimo 2)                                                                                                         |
| `diagrams`               | IDs de `content/architecture/diagrams`                                                                                                      |
| `related`                | slugs de otros patrones                                                                                                                     |
| `relatedLessons`, `tags` | IDs de lecciones existentes; etiquetas para búsqueda                                                                                        |

El cuerpo MDX debe tener, en este orden, los encabezados `## Motivación`, `## Ejemplo incorrecto`,
`## Implementación correcta` y `## Ejercicio`. La solución del ejercicio va dentro de `<Reveal>…</Reveal>`.

Entrecomillar todos los valores del frontmatter: un `: ` dentro de un valor sin comillas rompe el YAML.

## 2. Diagramas interactivos (`content/architecture/diagrams/<id>.json`)

```json
{
  "id": "hexagonal",
  "title": "…",
  "description": "…",
  "kind": "architecture",
  "tags": ["…"],
  "nodes": [
    {
      "id": "core",
      "label": "Núcleo",
      "kind": "boundary",
      "column": 2,
      "row": 0,
      "responsibility": "…",
      "examples": ["…"]
    },
    {
      "id": "usecase",
      "label": "Caso de uso",
      "kind": "port",
      "column": 2,
      "row": 1,
      "parent": "core",
      "responsibility": "…",
      "examples": ["…"]
    }
  ],
  "edges": [{ "id": "e-1", "from": "http", "to": "usecase", "kind": "sync", "label": "execute()" }],
  "steps": [{ "title": "1. …", "description": "…", "highlight": ["http", "e-1"] }]
}
```

- `column`/`row` son posiciones en una grilla lógica; un nodo `boundary` envuelve automáticamente a sus hijos
  (`parent`).
- `kind` del nodo: `actor`, `ui`, `service`, `domain`, `port`, `adapter`, `database`, `queue`, `cache`, `external`,
  `worker`, `boundary`. `kind` de la conexión: `sync`, `async`, `dependency`.
- El nombre del archivo debe coincidir con el `id`. Los pasos sólo pueden resaltar elementos existentes.

## 3. Comparador (`content/architecture/architectures.json`)

Cada perfil tiene `id`, `title`, `summary`, `fitsWhen` y una valoración `{ level: low | medium | high, explanation }`
para **todas** las dimensiones (`complexity`, `scalability`, `maintainability`, `latency`, `consistency`,
`operationalCost`, `deployability`, `testing`, `observability`, `coupling`). Las valoraciones son relativas entre
los perfiles del comparador; la explicación dice de qué depende. No usar números.

## 4. Desafíos de arquitectura (`content/system-design/challenges/<slug>/`)

- `challenge.mdx`: frontmatter con `id` (`sd.<slug>`), `title`, `summary`, `difficulty`, `durationMinutes`,
  `order`, `topics`, `functionalRequirements` (≥3), `nonFunctionalRequirements` (≥3), `scale`,
  `clarifyingQuestions` (`[{ question, why }]`, ≥3), `checklist` (≥5), `rubric` (`[{ id, criterion, description,
weight }]`, ≥4), `relatedPatterns` y `relatedSimulations`. El cuerpo es el escenario.
- `solution.mdx`: diseño de referencia con sus compromisos.

El espacio de diseño usa siempre las 8 fases de `SYSTEM_DESIGN_PHASES`
(`src/modules/system-design/domain/architecture-challenge.ts`).

## 5. Preguntas del Interview Arena (`content/interview/questions/<área>/<slug>.md`)

El área sale de la carpeta (`typescript`, `nodejs`, `react`, `nextjs`, `architecture`, `system-design`,
`databases`, `ai-engineering`).

```yaml
---
id: iq.<slug>
format: quick # o deep-dive
question: "…"
expectedPoints:
  - id: definicion
    point: "…"
followUps: ["…"]
commonMistakes: ["…"]
relatedLessons: []
relatedPatterns: []
---
Respuesta sólida de referencia en Markdown.
```

- Entre 3 y 7 criterios por pregunta, cada uno verificable ("menciona X"), con IDs únicos en la pregunta.
- Las preguntas `quick` (fuera de AI Engineering) alimentan el modo Quick; las `deep-dive`, el Deep Dive; todas las
  de `ai-engineering`, su modo propio.

## 6. Simuladores

No son contenido: son código de dominio en `src/modules/system-design/domain/simulations/`. Un simulador nuevo
implementa `SimulationDefinition`, se registra en `catalog.ts` y **debe** tener tests de las propiedades que dice
enseñar (ver `simulations.test.ts` y ADR-0007).
