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

## Próximas fases

| Fase                                                                          | Estado     |
| ----------------------------------------------------------------------------- | ---------- |
| 2 — Aprendizaje                                                               | Completada |
| 3 — Laboratorios (editor, Sandpack, SQL Playground con PGlite, challenges)    | Completada |
| 4 — Arquitectura y entrevistas (System Design Studio, Interview Arena)        | Pendiente  |
| 5 — Agentes IA (configuración, tool calling, memoria, evals)                  | Pendiente  |
| 6 — Persistencia y administración (PostgreSQL, auth, contenido personalizado) | Pendiente  |
| 7 — Producción (CI/CD, Vercel)                                                | Pendiente  |

### Contenido pendiente respecto del objetivo inicial (§35)

| Elemento                    | Actual                                          | Objetivo |
| --------------------------- | ----------------------------------------------- | -------- |
| Lecciones sustantivas       | 3                                               | 40       |
| Challenges                  | 12 (+ 6 ejercicios SQL)                         | 25       |
| Preguntas de evaluación     | 9 knowledge checks + 12 preguntas de entrevista | 60       |
| Flashcards                  | 32                                              | 30 ✅    |
| Diagramas                   | 3 (1 flujo + 2 Mermaid)                         | 12       |
| Simuladores o laboratorios  | 3 (playground TS, SQL Lab, React/Sandpack)      | 5        |
| Escenarios de System Design | 0                                               | 5        |
| Ruta de 7 días operativa    | No                                              | 1        |
