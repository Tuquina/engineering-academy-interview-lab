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

## Fase 2 — Aprendizaje · ✅ completada (2026-11-18)

### Implementado y verificado

- **Persistencia local unificada:** `ExternalStore<T>` (puerto en `shared/kernel`) + `LocalStorageStore<T>` genérico
  con validación, caché de snapshot, sincronización entre pestañas y fallback en memoria. Progreso migrado a **v2**
  con migración automática desde v1 (sin pérdida de datos).
- **Quizzes persistidos:** cada `<KnowledgeCheck id="…">` registra intentos y último resultado; la lección muestra
  el historial y el dashboard recomienda repasar lecciones con errores vigentes.
- **Flashcards (módulo `flashcards`):** 32 tarjetas en 4 mazos (`content/flashcards/*.json`), repetición espaciada con
  una adaptación documentada de SM-2 ([ADR-0005](adr/0005-spaced-repetition-and-recommendations.md)), límite diario
  de tarjetas nuevas, intervalo previsto visible en cada botón y atajos de teclado.
- **Buscador global (módulo `search`):** Ctrl/Cmd + K, combobox accesible, índice de secciones de la app, cursos,
  lecciones (incluidos objetivos y resumen), apartados de cada lección, rutas y cheatsheets. Sin dependencias.
- **Notas y marcadores (módulo `notebook`):** notas por lección con guardado automático, marcadores, página
  `/saved`. Las notas se renderizan como texto plano.
- **Lector de lecciones:** retomar la última sección leída, tamaño de lectura configurable (aplicado antes del
  primer pintado), atajos `,` / `.` para lección anterior/siguiente, tiempo de estudio activo.
- **Diagramas:** componente `<MermaidDiagram>` con carga diferida, tema claro/oscuro, `securityLevel: "strict"`,
  vista ampliada y fallback al código fuente.
- **Cheatsheets:** 3 hojas (`content/cheatsheets/*.mdx`) con filtro, favoritas y enlaces a lecciones.
- **Estadísticas (`/stats`):** racha, minutos (Recharts con tabla accesible), lecciones, knowledge checks por
  lección, flashcards con más fallos, progreso por curso.
- **Dashboard:** métricas reales (racha, minutos de 7 días, flashcards vencidas, precisión) y "Qué practicar hoy" con
  un algoritmo de recomendación transparente que explica cada sugerencia.
- **Rutas:** elección de ruta activa (preferencia) desde la página de la ruta.
- **Configuración (`/settings`):** tema, tamaño de lectura, tarjetas nuevas por día, atajos, exportar respaldo JSON y
  borrar datos locales con confirmación.
- **Contenido nuevo:** lecciones _Promises en profundidad: Promise<T> frente a Task<T> y CompletableFuture<T>_ y
  _El event loop de Node.js_, cada una con diagrama Mermaid, comparación con C#/Java y 3 knowledge checks.

### Verificación

| Comando                                           | Resultado                                              |
| ------------------------------------------------- | ------------------------------------------------------ |
| `pnpm typecheck`                                  | ✅                                                     |
| `pnpm lint`                                       | ✅                                                     |
| `pnpm test`                                       | ✅ 87 tests en 15 archivos                             |
| `pnpm build`                                      | ✅ 25 páginas estáticas                                |
| E2E (`docker compose --profile e2e run --rm e2e`) | ✅ 23 tests en escritorio y móvil (1 omitido en móvil) |

### Limitaciones conocidas

- El tiempo de estudio es una **estimación**: cuenta intervalos de 15 s con la pestaña visible e interacción en los
  últimos 2 minutos, sólo en lecciones y flashcards. Así se indica en la interfaz.
- Todo el estado de usuario sigue siendo local (modo invitado). Exportar el respaldo antes de limpiar el navegador.
- La importación del respaldo JSON no está implementada todavía (sólo exportación).
- No hay todavía una ruta de preparación de 7 días: requiere más lecciones publicadas para ser útil (§35).

## Fase 3 — Laboratorios · ✅ completada (2026-11-18)

Decisiones de ejecución aislada en [ADR-0006](adr/0006-isolated-code-execution-in-browser.md); formato del contenido
en [guides/adding-exercises.md](guides/adding-exercises.md).

### Implementado y verificado

- **Editor de código:** Monaco 0.57 auto-hospedado (funciona sin internet), chequeo de tipos en vivo, tema claro/oscuro,
  `Ctrl + Enter` para ejecutar, paneles redimensionables y modo pantalla completa.
- **Ejecución aislada (módulo `exercises`):** cada ejecución corre en un Web Worker nuevo sin APIs de red, con
  `require` restringido, 2 s por test y corte duro a los 15 s (un bucle infinito no congela la página). Consola
  capturada (hasta 200 entradas).
- **Tests y corrección:** harness propio (`test`, `expect`, `mockFn`, `sleep`) compartido entre el navegador y
  Vitest; tests públicos y ocultos agrupados por categoría (correctitud, casos límite, robustez, concurrencia).
- **Playground de TypeScript (`/lab`):** consola, JavaScript emitido y 3 ejemplos (`content/playground`).
- **SQL Playground (`/database-lab`):** PostgreSQL real (PGlite/WASM) en un Web Worker con un dataset de cobranzas
  (clientes, préstamos, cuotas, pagos, promesas, campañas, conversaciones), explorador de esquema, errores con
  SQLSTATE y posición, timeout de 10 s con reinicio y "Restablecer dataset".
- **6 ejercicios SQL autocorregidos** (`content/sql/exercises`): joins, window functions, subconsultas, `FILTER`,
  `DISTINCT ON` y un `UPSERT` idempotente (modo `state`). La corrección compara contra la solución dentro de
  transacciones con `ROLLBACK`.
- **Challenges (módulo `challenges`, `/challenges`):** 12 desafíos con filtros por tipo, tecnología, dificultad y tipo
  de entrevista; pistas progresivas, solución de referencia explicada y preguntas de seguimiento.
  - 8 de código: debounce, throttle, retry con backoff, concurrency limiter, Result type, webhook idempotente,
    carrera en un cobro, memoria de un agente de cobranzas.
  - 1 de React (Sandpack + Jest + Testing Library): corregir un `useEffect` problemático.
  - 1 de SQL (promesas de pago incumplidas).
  - 2 de diseño con rúbrica y autoevaluación: rate limiting y agentes multi-tenant.
- **Guardado de intentos (`eal:practice`):** intentos (tests aprobados / total, resuelto), borradores por challenge,
  respuestas y rúbricas de diseño, y soluciones reveladas. El catálogo marca los resueltos.
- **Dashboard y estadísticas:** "Resolver un desafío" lleva al primer challenge sin resolver; `/stats` suma
  "Challenges resueltos". La navegación habilita Laboratorio de código, Challenges y Database Lab.

### Verificación

| Comando                                           | Resultado                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm typecheck`                                  | ✅                                                                        |
| `pnpm lint`                                       | ✅                                                                        |
| `pnpm test`                                       | ✅ 118 tests en 21 archivos (incluye soluciones de referencia y SQL real) |
| `pnpm build`                                      | ✅ 47 páginas estáticas                                                   |
| E2E (`docker compose --profile e2e run --rm e2e`) | ✅ 30 tests (8 de laboratorios omitidos en móvil a propósito)             |

Los E2E de laboratorios cubren: starter que falla y solución que pasa (con tests ocultos), corte de un bucle
infinito, playground, corrección SQL, errores de PostgreSQL, persistencia de un challenge de diseño y los tests de
React ejecutados de verdad en Sandpack.

### Limitaciones conocidas

- Los challenges de React **requieren internet** (bundler de CodeSandbox) y un contexto seguro (`localhost` o HTTPS).
  El resto de los laboratorios funciona sin conexión.
- Los tests ocultos viajan al navegador: no son secretos, sólo no se muestran por defecto.
- Los challenges de diseño son **autoevaluados** con rúbrica; no hay corrección automática.
- No hay un sandbox de Node.js real (`fs`, procesos): el código corre en un Web Worker.
- Hay un solo challenge de React; los laboratorios con editor se usan en escritorio (en móvil son navegables pero no
  se verifican en E2E).

## Fase 4 — Arquitectura y entrevistas · ✅ completada (2026-11-19)

Decisiones en [ADR-0007](adr/0007-architecture-studio-and-interview-arena.md); formato del contenido en
[guides/adding-architecture-content.md](guides/adding-architecture-content.md).

### Implementado y verificado

- **Pattern Library (`/patterns`, módulo `architecture`):** 10 patrones (Strategy, Adapter, Decorator, Repository,
  State, arquitectura hexagonal, CQRS, Saga, Transactional Outbox, Circuit Breaker). Cada uno con definición,
  problema, motivación, diagrama, ejemplo incorrecto, implementación correcta en TypeScript, ejercicio con solución
  plegable, beneficios, costos, alternativas, errores frecuentes, cuándo no usarlo y preguntas de entrevista.
- **Diagramas interactivos (React Flow):** 10 diagramas (hexagonal, capas y dirección de dependencias, monolito
  modular, microservicios, orientada a eventos, CQRS, saga, outbox/inbox, circuit breaker, síncrono vs asíncrono).
  Zoom, pan, pantalla completa, inspección de cada elemento (responsabilidad, ejemplos, conexiones), lista accesible
  por teclado y recorrido paso a paso.
- **Comparador de arquitecturas:** 4 estilos en 10 dimensiones, con valoraciones cualitativas relativas y la
  explicación de cada compromiso; sin números inventados.
- **System Design Studio (`/system-design`, módulo `system-design`):**
  - **Architecture Canvas:** 14 tipos de componentes, agregar con clic o arrastrando, conexiones síncronas y
    asíncronas (arrastrando o con un formulario accesible), propiedades conceptuales por tipo, varios diagramas
    guardados, importar y exportar JSON, exportar imagen PNG y resumen en texto.
  - **6 simuladores deterministas** con línea temporal, métricas por tick, eventos y resumen: balanceo de carga y
    escalado horizontal, reintentos con backoff y jitter, cache hit/miss y stampede, rate limiting (ventana fija,
    deslizante y token bucket), caída de un servicio y circuit breaker, colas (duplicados, desorden y acumulación).
    Cada uno declara sus simplificaciones y cómo se observa en infraestructura real.
  - **4 desafíos de arquitectura** (§15.4): cobranzas masivas, plataforma multi-tenant de agentes, webhooks
    confiables y orquestador de campañas. Requerimientos funcionales y no funcionales, datos de escala, preguntas
    aclaratorias, espacio de diseño en 8 fases (con el canvas en la fase de componentes), checklist, rúbrica de
    autoevaluación y diseño de referencia.
- **Interview Arena (`/interview`, módulo `interviews`):** 7 modos (Quick, Technical Deep Dive, Live Coding con
  tests reales, System Design en 8 fases con reloj, AI Engineering, Mock completa con secciones configurables y
  repaso de puntos débiles). Banco de 27 preguntas en 8 áreas, cada una con criterios esperados, respuesta sólida,
  errores frecuentes y seguimiento. Tras cada respuesta: criterios esperados, autoevaluación, criterios faltantes
  resaltados, respuesta de referencia y preguntas de seguimiento. Historial de sesiones y cobertura por área.
- **Integración:** el dashboard enlaza "Practicar para entrevista" y recomienda repasar preguntas con criterios
  faltantes; `/stats` cuenta entrevistas simuladas; el buscador incluye patrones, diagramas, challenges, desafíos de
  arquitectura y simuladores; la navegación habilita las tres secciones.
- **Corrección:** el botón "Ejecutar tests" de los challenges de código quedaba habilitado antes de que cargara el
  editor y no hacía nada; ahora se habilita con el editor listo.
- El challenge de diseño "plataforma multi-tenant de agentes" de `/challenges` se reemplazó por el desafío completo
  del Studio (ahora hay 11 challenges en `/challenges`).

### Verificación

| Comando                                           | Resultado                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck`                                  | ✅                                                                       |
| `pnpm lint`                                       | ✅                                                                       |
| `pnpm test`                                       | ✅ 172 tests en 26 archivos (incluye propiedades de los simuladores)     |
| `pnpm build`                                      | ✅ 89 páginas estáticas                                                  |
| E2E (`docker compose --profile e2e run --rm e2e`) | ✅ 39 tests (los de laboratorios, canvas y sesiones, sólo en escritorio) |

Los tests de los simuladores verifican propiedades del modelo (por ejemplo, que least connections tiene mejor p95
que round robin con una réplica degradada, o que la ventana fija deja pasar el doble del límite en el borde) para
que lo que la interfaz enseña sea cierto en el modelo. Los E2E de la fase cubren el patrón con su diagrama, el
comparador, el canvas (agregar, conectar, persistir y exportar), un simulador, un desafío de arquitectura, una
entrevista rápida con su registro y recomendación, y el live coding con tests reales.

### Limitaciones conocidas

- **Sin evaluación con IA:** toda evaluación es autoevaluación contra criterios explícitos (§21). La evaluación
  asistida queda para la Fase 5.
- Los simuladores son **modelos simplificados** (así se indica en cada uno); no cubren todavía deadlocks,
  consistencia eventual entre réplicas ni latencia de base de datos como simuladores propios.
- La biblioteca tiene 10 de los ~40 patrones que lista §14; faltan, entre otros, Factory, Builder, Observer,
  Command, Unit of Work, Bulkhead, Strangler Fig y Anti-Corruption Layer.
- El canvas guarda en `localStorage` (hasta 40 diagramas); exportar JSON es la forma de respaldarlos.
- El live coding parte del borrador guardado del challenge si existe (se puede reiniciar con "Reiniciar").
- Las entrevistas no graban audio: responder en voz alta queda a cargo del usuario.

## Fase 4.5 — Teoría de los cursos · ✅ completada (2026-11-19)

Fase agregada a pedido del usuario (ADR-0008): cursos completos de introducción y teoría, entendibles desde cero
para alguien que ya programa. Cada curso suma un módulo **Introducción** (qué es, cómo se usa, sintaxis básica y
mapa del curso) y lecciones que cubren el temario de cada módulo con teoría, diagramas, código, comparación con
C# y Java, errores frecuentes, knowledge checks y preguntas de entrevista.

| Curso                    | Lecciones | Estado     |
| ------------------------ | --------- | ---------- |
| TypeScript               | 11        | ✅ Tanda 1 |
| Node.js                  | 9         | ✅ Tanda 2 |
| React                    | 7         | ✅ Tanda 3 |
| Next.js                  | 5         | ✅ Tanda 3 |
| LLMs y agentes de IA     | 8         | ✅ Tanda 4 |
| PostgreSQL               | 6         | ✅ Tanda 5 |
| Redis                    | 4         | ✅ Tanda 5 |
| Arquitectura de software | 5         | ✅ Tanda 6 |
| System Design            | 5         | ✅ Tanda 6 |

### Implementado y verificado

- **Arquitectura de software (5 lecciones):** introducción (decisiones, atributos de calidad, compromisos, ADRs,
  C4), principios (SOLID, DRY/KISS/YAGNI, acoplamiento y cohesión, inversión de dependencias, pirámide de testing,
  DDD), patrones de diseño en TypeScript, estilos (capas, hexagonal, monolito modular, microservicios, Strangler Fig)
  y patrones distribuidos (eventos, event sourcing, CQRS, sagas, outbox/inbox, DLQ, circuit breaker, bulkhead, BFF).
- **System Design (5 lecciones):** introducción (fases de la respuesta, requerimientos, estimaciones), escalabilidad
  y disponibilidad (balanceo, réplicas, sharding, SLOs), consistencia (CAP/PACELC, read-your-writes, idempotencia de
  punta a punta), mensajería y resiliencia (colas, DLQ, backpressure, webhooks, RPO/RTO) y plataformas multi-tenant.
- **PostgreSQL (6 lecciones):** introducción y SQL esencial (Docker, psql, tipos, DDL/DML, agregaciones, NULL,
  consultas parametrizadas), modelado (normalización, claves, constraints, JSONB, migraciones expand/contract),
  consultas (joins, CTEs, window functions, keyset), índices y EXPLAIN ANALYZE, transacciones (aislamiento, MVCC,
  locks, SKIP LOCKED, upserts, outbox) y operación (pooling, particionado, inyección SQL, RLS, mantenimiento). Los
  ejemplos de window functions corren tal cual en el Database Lab.
- **Redis (4 lecciones):** introducción (comandos, atomicidad, clientes), estructuras, expiración, persistencia y
  eviction, patrones (cache aside, stampede, rate limiting con Lua, idempotencia, locks y sus límites, Pub/Sub y
  Streams) y compromisos frente a PostgreSQL y a brokers.
- **LLMs y agentes (8 lecciones):** introducción (qué es un LLM y un agente, Messages API, puerto propio),
  tokens, contexto, variabilidad, costos, latencia y prompt caching, prompts, salidas estructuradas y el loop de
  tool calling, alucinaciones, prompt injection y RAG con embeddings, configuración versionada, herramientas con
  mínimo privilegio, routing, fallbacks y máquinas de estado, guardrails, human in the loop y observabilidad,
  memoria y contexto (estado de negocio frente a historial), y evaluaciones (datasets, LLM as judge, estadística,
  quality gates). Ejemplos del SDK verificados contra la referencia oficial de la API de Claude.
- **React (7 lecciones):** introducción (UI declarativa, JSX, props, estado, eventos, listas y keys), render y
  commit, reconciliación y pureza, composición y lifting state, useState/useReducer/useEffect (y cuándo no usar
  efectos), memoización, refs, Context y custom hooks, server state con TanStack Query, formularios, Actions de
  React 19, Suspense y error boundaries, y calidad (Profiler, Testing Library, accesibilidad, XSS, arquitectura).
- **Next.js (5 lecciones):** introducción y convenciones del App Router, routing (layouts, route groups, rutas
  dinámicas, errores con `retry`), Server y Client Components (hidratación, streaming), datos (capa de acceso a
  datos, `use cache`, `cacheLife`, `cacheTag`, `updateTag`, Server Actions, Route Handlers, `proxy`) y producción
  (sesiones, protección en capas, metadata, imágenes, entorno, despliegue, instrumentation). Verificado contra la
  documentación incluida en `next.4.6`.
- **Node.js (9 lecciones):** introducción (qué es, LTS, Docker, `package.json`, npm y pnpm, ESM y CommonJS,
  `process`, módulos del núcleo, servidor con `node:http` y frameworks), event loop, streams y backpressure,
  thread pool, worker threads y memoria (GC, fugas), APIs por capas (REST, Problem Details, middleware,
  versionado), autenticación y autorización (sesiones, JWT, OIDC, contraseñas, BOLA, multi-tenant), webhooks,
  idempotency keys, rate limiting y timeouts, observabilidad (Pino, `AsyncLocalStorage`, OpenTelemetry) y tests
  de integración, y performance (load testing, profiling, N+1, pooling, caché, escalado horizontal).
- **TypeScript (11 lecciones):** introducción al lenguaje y su ecosistema (motores, runtimes, `tsc`, `tsconfig`,
  tipos básicos), JavaScript moderno esencial (alcance, igualdad, `this`, destructuring, métodos de arrays, clases,
  módulos, excepciones), runtime vs tipos, interfaces e inferencia (`satisfies`, widening), uniones y narrowing
  (discriminated unions, `never`), genéricos, tipos derivados (mapped, conditional, `infer`, template literals),
  APIs type-safe (branded types, Zod, DTOs, `process.env`), Promises, control de la asincronía (cancelación,
  timeouts, pool de concurrencia, race conditions, reintentos con jitter) y diseño (módulos, funciones puras,
  inversión de dependencias, `Result`, Vitest con fakes).
- **Verificación de diagramas:** `tests/content/lesson-diagrams.test.ts` parsea con Mermaid todos los diagramas de
  lecciones y cheatsheets; un diagrama roto falla el test en lugar de mostrarse como código en el navegador.
- **Ruta principal:** empieza por la introducción de TypeScript; los cursos completos se expanden solos en la ruta.

### Verificación

60 lecciones en 9 cursos (cada curso con su módulo de introducción), 180 knowledge checks y 105 diagramas (Mermaid y
de flujo), todos parseados por el test de diagramas. Cada lección pasa el mínimo de calidad de
`catalog-content.test.ts` (secciones, extensión, referencias oficiales y preguntas de entrevista) y compila en el
build de producción. Los detalles dependientes de versión se verificaron contra la documentación incluida en
`next@16.4.6` y contra la referencia oficial de la API de Claude.

### Limitaciones conocidas

- Algunos temas de los temarios se cubren dentro de lecciones más amplias en lugar de tener una lección propia (por
  ejemplo, Template Method o Composite dentro de la lección general de patrones).
- Los ejemplos de código de las lecciones son ilustrativos y no se ejecutan en los tests; los que se pueden practicar
  están en los challenges, el playground y el Database Lab (los ejemplos de window functions corren tal cual ahí).
- Las referencias a precios, modelos y versiones de proveedores reflejan noviembre de 2026; las lecciones remiten a la
  documentación oficial para valores vigentes.
- Todavía no hay una ruta de preparación de 7 días (§35).

## Próximas fases

| Fase                                                                          | Estado     |
| ----------------------------------------------------------------------------- | ---------- |
| 2 — Aprendizaje                                                               | Completada |
| 3 — Laboratorios (editor, Sandpack, SQL Playground con PGlite, challenges)    | Completada |
| 4 — Arquitectura y entrevistas (System Design Studio, Interview Arena)        | Completada |
| 4.5 — Teoría de los cursos (ADR-0008)                                         | Completada |
| 5 — Agentes IA (configuración, tool calling, memoria, evals)                  | Pendiente  |
| 6 — Persistencia y administración (PostgreSQL, auth, contenido personalizado) | Pendiente  |
| 7 — Producción (CI/CD, Vercel)                                                | Pendiente  |

### Contenido pendiente respecto del objetivo inicial (§35)

| Elemento                    | Actual                                        | Objetivo |
| --------------------------- | --------------------------------------------- | -------- |
| Lecciones sustantivas       | 60                                            | 40 ✅    |
| Challenges                  | 11 + 4 de arquitectura (+ 6 ejercicios SQL)   | 25       |
| Preguntas de evaluación     | 180 knowledge checks + 27 del Interview Arena | 60 ✅    |
| Flashcards                  | 32                                            | 30 ✅    |
| Diagramas                   | 13 (10 interactivos + 1 flujo + 2 Mermaid)    | 12 ✅    |
| Simuladores o laboratorios  | 9 (3 laboratorios + 6 simuladores)            | 5 ✅     |
| Escenarios de System Design | 5 (4 del Studio + rate limiting)              | 5 ✅     |
| Ruta de 7 días operativa    | No                                            | 1        |
