# Cómo agregar challenges, ejercicios SQL y ejemplos del playground

Todo el contenido de práctica vive en `content/` y se publica sin tocar código: al agregar una carpeta o archivo
aparece en el catálogo, en el buscador y en el dashboard. El frontmatter se valida con Zod al construir; un error de
formato hace fallar `pnpm build` con el archivo y el campo exactos.

Después de agregar contenido, correr siempre:

```bash
docker compose run --rm app pnpm check
```

Los tests de contenido (`tests/content/`) ejecutan **las soluciones de referencia contra todos los tests** (públicos y
ocultos), verifican que el starter **falle** al menos un test y chequean tipos. Un challenge cuya solución no pase no
llega a `main`.

## 1. Challenge de código (`kind: code`)

```
content/challenges/<slug>/
  challenge.mdx      # frontmatter + enunciado (MDX)
  starter.ts         # código inicial que ve el usuario (debe fallar algún test)
  tests.ts           # tests públicos (visibles en la interfaz)
  hidden-tests.ts    # tests ocultos: casos límite, robustez, concurrencia
  solution.ts        # solución de referencia (debe pasar todo)
  solution.mdx       # explicación de la solución, compromisos y complejidad
```

Frontmatter de `challenge.mdx`:

| Campo                | Tipo / valores                                                        |
| -------------------- | --------------------------------------------------------------------- |
| `id`                 | `challenge.<slug>`, estable (el progreso se guarda por ID)            |
| `kind`               | `code` · `react` · `sql` · `design`                                   |
| `title`, `summary`   | texto                                                                 |
| `difficulty`         | `basic` · `intermediate` · `advanced`                                 |
| `durationMinutes`    | entero                                                                |
| `technologies`       | lista (se usa en el filtro del catálogo)                              |
| `topics`, `skills`   | listas                                                                |
| `interviewType`      | `live-coding` · `take-home` · `system-design` · `technical-deep-dive` |
| `order`              | entero (orden en el catálogo)                                         |
| `constraints`        | lista opcional                                                        |
| `acceptanceCriteria` | lista                                                                 |
| `hints`              | lista; se revelan de a una                                            |
| `followUpQuestions`  | lista; preguntas de seguimiento de entrevista                         |
| `relatedLessons`     | IDs de lecciones existentes (se valida la referencia)                 |

Los tests importan desde `./solution` y usan el harness propio (`src/modules/exercises/domain/test-harness.ts`), que
tiene la misma API en Vitest (CI) y en el Web Worker del navegador:

```ts
import { debounce } from "./solution";

test(
  "ejecuta una sola vez después de la ráfaga",
  async () => {
    const fn = mockFn<[string]>();
    const search = debounce(fn, 40);
    search("d");
    search("de");
    await sleep(80);
    expect(fn).toHaveBeenCalledTimes(1);
  },
  { category: "edge-cases", timeoutMs: 1_000 },
);
```

- Globales disponibles: `test`, `expect` (`toBe`, `toEqual`, `toThrow`, `rejects`/`resolves`, …), `mockFn`, `sleep`.
- `category`: `correctness` (por defecto), `edge-cases`, `robustness`, `concurrency`. El resultado se agrupa por
  categoría.
- Cada test tiene 2 s por defecto; la ejecución completa se corta a los 15 s (bucles infinitos incluidos).
- El código corre sin acceso a red (`fetch`, `XMLHttpRequest`, `WebSocket` bloqueados) y `require` sólo resuelve
  `./solution`.
- Los tests ocultos **no son secretos**: viajan al navegador. Sirven para no condicionar la solución, no como examen.

## 2. Challenge de React (`kind: react`)

Igual que el de código, pero con `starter.tsx`, `tests.tsx` y `solution.tsx`. Los tests usan Jest y
`@testing-library/react` dentro de **Sandpack** (bundler de CodeSandbox, **requiere internet**) e importan desde
`./App`. No hay `hidden-tests`. En CI se verifican con Vitest + jsdom (`tests/content/react-challenges-content.test.ts`).

## 3. Challenge SQL (`kind: sql`)

`challenge.mdx` con `sqlExerciseId: sql.<id>` apuntando a un ejercicio de `content/sql/exercises/`, más
`solution.mdx`. La corrección la hace el ejercicio SQL referenciado.

## 4. Challenge de diseño (`kind: design`)

`challenge.mdx` + `solution.mdx` y una `rubric`:

```yaml
rubric:
  - id: algorithm
    criterion: "Algoritmo justificado"
    description: "Elige token bucket o sliding window y explica el problema de la fixed window."
    weight: 3
```

La respuesta y la autoevaluación se guardan localmente. **No hay corrección automática**: la interfaz lo dice
explícitamente y muestra el puntaje como autoevaluación.

## 5. Ejercicios SQL (`content/sql/exercises/NN-<slug>.md`)

Corren contra PostgreSQL real (PGlite/WASM) en el navegador con el dataset `content/sql/dataset.sql` (un marketplace con
catálogo, pedidos, pagos, envíos, reseñas y soporte, más un esquema chico de reservas; fecha de referencia 2026-11-15). Dos modos:

- `mode: result` + `orderMatters`: compara el resultado de la consulta del usuario con el de `solution` (columnas,
  filas y, si corresponde, orden).
- `mode: state` + `checkQuery` + `runTimes`: ejecuta la sentencia del usuario `runTimes` veces (útil para probar
  idempotencia) y compara el resultado de `checkQuery` con el que produce la solución.

Ambos modos corren dentro de transacciones con `ROLLBACK`: el dataset nunca queda modificado.

```yaml
---
id: sql.revenue-by-seller
title: "Ventas por vendedor"
difficulty: basic
order: 1
topics: ["joins", "agregaciones"]
mode: result
orderMatters: true
hints: ["…"]
solution: |
  SELECT …
---
Enunciado en Markdown.
```

`tests/content/sql-lab-content.test.ts` ejecuta cada solución contra el dataset real y verifica que se corrija como
correcta.

## 6. Ejemplos del playground (`content/playground/*.ts`)

Un archivo TypeScript con dos comentarios iniciales:

```ts
// title: Orden del event loop
// description: Código síncrono, microtasks y timers.
```

Aparecen en el selector "Cargar un ejemplo" de `/lab`. Los tests de contenido verifican que compilen.

## 7. Casos de evaluación del AI Agents Lab

El golden dataset está en `src/modules/agent-lab/domain/eval-suite.ts` (los casos propios se crean desde la interfaz
del Eval Playground y viven en `localStorage`). Cada caso define el cliente, los mensajes de la persona y las
verificaciones:

- **Preferí verificaciones deterministas**: `tool_called` (con `argsInclude` para fijar argumentos), `tool_not_called`,
  `state` (promesa registrada, escalamiento, no contactar, pago aplicado), `no_foreign_customer_access`,
  `max_tool_calls`, `avoids_forbidden_phrases`, `discloses_ai`.
- `mentions` es una **heurística semántica**: busca un concepto de `CONCEPTS` (conjuntos de sinónimos sobre texto sin
  acentos). Para un concepto nuevo, agregalo a `CONCEPTS` con sus patrones.
- `judge` (LLM as Judge) sólo se ejecuta con un proveedor real; con el local queda como omitida, nunca aprobada.
- Marcá `critical: true` sólo lo que nunca puede fallar (seguridad, cumplimiento): el quality gate exige el 100 % de
  las repeticiones.

El test `agent-runner.test.ts` exige que la v2 de ejemplo con variabilidad 0 apruebe todo el dataset: si agregás un
caso que el proveedor local no puede resolver con sus reglas (`local-intents.ts`), ajustá las reglas o documentá por
qué el caso queda para un modelo real.
