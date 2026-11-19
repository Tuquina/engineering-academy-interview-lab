# MASTER PROMPT — Engineering Academy: Interview Lab

> **Documento fuente de verdad del proyecto.** Contiene la especificación completa de producto, arquitectura, contenido y plan de implementación.
> Cualquier decisión que se aparte de este documento debe registrarse como ADR en `docs/adr/`.

## Índice

0. [Tu rol y objetivo](#0-tu-rol-y-objetivo)
1. [Contexto del usuario](#1-contexto-del-usuario)
2. [Filosofía del producto](#2-filosofía-del-producto)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Arquitectura de software obligatoria](#4-arquitectura-de-software-obligatoria)
5. [Diseño visual y experiencia de usuario](#5-diseño-visual-y-experiencia-de-usuario)
6. [Navegación principal](#6-navegación-principal)
7. [Dashboard principal](#7-dashboard-principal)
8. [Motor de contenido educativo](#8-motor-de-contenido-educativo)
9. [Estructura pedagógica de cada lección](#9-estructura-pedagógica-de-cada-lección)
10. [Curso completo: TypeScript](#10-curso-completo-typescript)
11. [Curso completo: Node.js](#11-curso-completo-nodejs)
12. [Curso completo: React](#12-curso-completo-react)
13. [Curso completo: Next.js](#13-curso-completo-nextjs)
14. [Arquitectura de software y patrones](#14-arquitectura-de-software-y-patrones)
15. [System Design Studio](#15-system-design-studio)
16. [LLMs y agentes de inteligencia artificial](#16-llms-y-agentes-de-inteligencia-artificial)
17. [PostgreSQL y SQL Lab](#17-postgresql-y-sql-lab)
18. [Redis Lab](#18-redis-lab)
19. [Laboratorio de programación](#19-laboratorio-de-programación)
20. [Challenges de entrevista](#20-challenges-de-entrevista)
21. [Interview Arena](#21-interview-arena)
22. [Sistema de aprendizaje y memoria](#22-sistema-de-aprendizaje-y-memoria)
23. [Planes de preparación](#23-planes-de-preparación)
24. [Cheatsheets y referencias](#24-cheatsheets-y-referencias)
25. [Mini proyecto integrador](#25-mini-proyecto-integrador)
26. [Biblioteca de diagramas](#26-biblioteca-de-diagramas)
27. [Administración y extensibilidad](#27-administración-y-extensibilidad)
28. [Modelo de datos](#28-modelo-de-datos)
29. [Autenticación y progreso](#29-autenticación-y-progreso)
30. [Asistente de estudio con IA](#30-asistente-de-estudio-con-ia)
31. [Testing y calidad](#31-testing-y-calidad)
32. [Seguridad](#32-seguridad)
33. [Performance y observabilidad](#33-performance-y-observabilidad)
34. [Experiencias interactivas adicionales](#34-experiencias-interactivas-adicionales)
35. [Contenido inicial y calidad educativa](#35-contenido-inicial-y-calidad-educativa)
36. [Plan de implementación](#36-plan-de-implementación)
37. [Entregables técnicos](#37-entregables-técnicos)
38. [Criterios de aceptación](#38-criterios-de-aceptación)
39. [Instrucciones finales de ejecución](#39-instrucciones-finales-de-ejecución)
- [Principio central](#principio-central)

---

## 0. TU ROL Y OBJETIVO

Actuá como un equipo senior de ingeniería de software integrado por:

- **Principal Software Architect** especializado en Clean Architecture, arquitectura hexagonal, DDD y sistemas distribuidos.
- **Senior Full Stack Engineer** experto en TypeScript, Node.js, React y Next.js.
- **Staff Backend Engineer** especializado en PostgreSQL, Redis, concurrencia y sistemas event-driven.
- **AI Engineer** especializado en agentes LLM, tool calling, memoria y evaluaciones.
- **Senior UX/UI Designer** especializado en aplicaciones educativas y herramientas para desarrolladores.
- **Tech Lead** especializado en calidad, testing, performance y DevOps.
- **Diseñador instruccional** especializado en enseñanza técnica para desarrolladores experimentados.

Tu misión es diseñar e implementar una aplicación web completa, funcional, extensible y preparada para desplegar en Vercel, llamada provisionalmente:

**Engineering Academy — Interview Lab**

No quiero una landing page ni un prototipo visual. Quiero una plataforma educativa real que permita aprender, practicar, experimentar, escribir código, resolver desafíos, analizar arquitecturas y prepararme para entrevistas técnicas de ingeniería de software.

La aplicación deberá ser profesional tanto en diseño como en arquitectura interna.

Priorizá una experiencia de aprendizaje extraordinaria, con interacciones útiles y contenido técnico profundo.

---

## 1. CONTEXTO DEL USUARIO

La plataforma está dirigida inicialmente a un ingeniero de software con experiencia profesional en:

- C# y .NET.
- Java y Spring Boot.
- Arquitectura backend.
- REST APIs.
- Arquitectura limpia y buenas prácticas.
- PostgreSQL, Oracle y SQL Server.
- AWS, Docker, colas y sistemas asíncronos.
- React y Go, con experiencia en proyectos personales.
- Sistemas de cobranza y fintech.
- Integración de herramientas de IA en desarrollo de software.

No es un principiante en programación.

El objetivo es profundizar especialmente en tecnologías y conceptos requeridos por posiciones Full Stack orientadas a plataformas de agentes de IA.

El usuario necesita dominar y demostrar conocimientos en:

1. TypeScript y Node.js.
2. React y Next.js.
3. Arquitectura de software y System Design.
4. LLMs, agentes, memoria, herramientas y evaluaciones.
5. PostgreSQL y Redis.
6. Patrones de diseño, Clean Architecture y arquitectura hexagonal.
7. Calidad de código, testing, CI/CD, AWS y Docker.
8. Resolución de desafíos técnicos y entrevistas.
9. Diseño de APIs, webhooks e integraciones.
10. Sistemas escalables, multi-tenant y event-driven.

La plataforma debe ser útil también para aprender nuevas tecnologías en el futuro.

**Idioma:** el contenido estará en español, conservando los nombres técnicos habituales en inglés. El código utilizará identificadores en inglés y documentación de métodos y clases en español.

---

## 2. FILOSOFÍA DEL PRODUCTO

La plataforma debe combinar las mejores ideas de:

- Una plataforma de cursos técnicos como Educative.
- Una plataforma de ejercicios de programación como LeetCode.
- Un entorno de programación interactivo como CodeSandbox.
- Una plataforma de rutas de aprendizaje como roadmap.sh.
- Un sistema de repetición espaciada como Anki.
- Una herramienta de diagramas de arquitectura.
- Un simulador de entrevistas técnicas.
- Un laboratorio de agentes de inteligencia artificial.

Son referencias conceptuales, no instrucciones para copiar diseños o contenido protegido.

### Principios obligatorios

**Aprender haciendo.** Nunca limitar una temática a un artículo largo. Cada concepto importante debe disponer de explicación, ejemplos, ejercicios y oportunidades de aplicación.

**Enseñar el razonamiento.** Además de explicar cómo funciona algo, enseñar:

- Por qué existe.
- Qué problema resuelve.
- Cuándo conviene utilizarlo.
- Cuándo NO conviene utilizarlo.
- Qué alternativas existen.
- Qué compromisos introduce.
- Qué errores cometen habitualmente los desarrolladores.
- Cómo explicarlo durante una entrevista.

**Enfoque senior.** No enseñar únicamente sintaxis. Incluir diseño, performance, mantenibilidad, concurrencia, testing y decisiones arquitectónicas.

**Progresión.** Cada tema tendrá niveles básico, intermedio y avanzado, con rutas de aprendizaje según conocimientos previos.

**Contenido extensible.** Agregar nuevas áreas, cursos, módulos y ejercicios debe ser sencillo y no requerir modificar el núcleo de la plataforma.

**Calidad real.** No presentar funcionalidades simuladas como si fueran reales. Si un laboratorio necesita infraestructura externa, proporcionar un modo local auténtico y explicar sus limitaciones.

---

## 3. STACK TECNOLÓGICO

### Frontend

- Next.js con App Router.
- React.
- TypeScript en modo estricto.
- Tailwind CSS.
- shadcn/ui y Radix UI para componentes accesibles.
- Lucide para iconografía.
- Framer Motion o Motion para animaciones discretas.
- TanStack Query cuando la sincronización de estado remoto lo justifique.
- React Hook Form y Zod para formularios.
- Zustand únicamente si existe estado global de cliente que lo justifique.
- Monaco Editor para edición avanzada de código.
- Sandpack para laboratorios de React y TypeScript compatibles con ejecución en navegador.
- Mermaid para diagramas declarativos.
- React Flow para diagramas interactivos y sistemas de nodos.
- Recharts para gráficos de progreso.
- MDX para contenido educativo enriquecido.

Utilizá las versiones estables vigentes y verificá compatibilidad entre dependencias.

### Backend

- Node.js.
- TypeScript estricto.
- Next.js Route Handlers ejecutados en Vercel Functions.
- Zod para validación de entradas y contratos.
- OpenAPI para documentación de los endpoints que correspondan.
- Arquitectura hexagonal y modular.
- Inyección de dependencias mediante composición explícita.

No agregar Express, NestJS ni otro framework backend por defecto. El backend de Next.js es suficiente inicialmente.

Diseñar los módulos para que puedan extraerse posteriormente a un servicio Node.js independiente sin reescribir el dominio ni los casos de uso.

### Persistencia

- PostgreSQL.
- Drizzle ORM o una alternativa madura, seleccionando una sola para evitar duplicidad.
- Migraciones versionadas.
- Neon o Supabase como proveedor administrado de PostgreSQL.
- Redis mediante Upstash, opcional según la funcionalidad.
- Almacenamiento local para prácticas y modo invitado.

Para producción, usar conexiones y pooling adecuados para entornos serverless.

### Herramientas de calidad

- pnpm.
- ESLint.
- Prettier.
- TypeScript type checking.
- Vitest.
- React Testing Library.
- Playwright.
- GitHub Actions.
- Docker Compose para servicios de desarrollo local cuando sea necesario.

### Despliegue

- Vercel será el destino principal.
- La aplicación deberá funcionar en un único proyecto de Next.js, incluyendo frontend y endpoints backend.
- Diseñar una solución que respete los límites de ejecución, memoria y duración de Vercel Functions.
- No depender de procesos permanentes dentro de funciones serverless.
- Para trabajos pesados, colas o ejecución de código aislado, usar adaptadores hacia servicios adecuados.

---

## 4. ARQUITECTURA DE SOFTWARE OBLIGATORIA

Quiero una arquitectura limpia, hexagonal, modular y escalable.

No quiero una estructura de carpetas que simplemente se llame Clean Architecture sin cumplir sus principios.

### 4.1 Principios

Aplicar:

- SOLID.
- Separation of Concerns.
- Dependency Inversion.
- Ports and Adapters.
- DDD pragmático.
- High Cohesion / Low Coupling.
- DRY, KISS y YAGNI.
- Composición sobre herencia cuando corresponda.
- Inmutabilidad donde aporte valor.
- Diseño orientado a contratos.
- Fail Fast y validación explícita.
- Programación defensiva en límites de confianza.
- Testing de comportamiento.

Evitar sobreingeniería.

No introducir repositorios, servicios, factories o interfaces innecesarias si no existe una responsabilidad clara que justifique su presencia.

### 4.2 Estructura propuesta

Organizar el proyecto aproximadamente así:

| Ruta | Responsabilidad |
|---|---|
| `src/app/` | Rutas, layouts, páginas y Route Handlers. |
| `src/modules/learning/` | Contenido y navegación educativa. |
| `src/modules/exercises/` | Ejercicios y corrección. |
| `src/modules/challenges/` | Desafíos de programación. |
| `src/modules/interviews/` | Entrevistas simuladas. |
| `src/modules/progress/` | Progreso y estadísticas. |
| `src/modules/flashcards/` | Repetición espaciada. |
| `src/modules/architecture-lab/` | Diagramas y simuladores. |
| `src/modules/agent-lab/` | Laboratorios de agentes LLM. |
| `src/modules/content-management/` | Administración de contenido. |
| `src/modules/auth/` | Identidad y autorización. |
| `src/shared/` | Utilidades y componentes realmente compartidos. |
| `src/infrastructure/` | Configuración e integraciones globales. |
| `content/` | Cursos, lecciones, ejercicios, diagramas y metadatos. |
| `tests/` | Pruebas compartidas y end-to-end. |
| `docs/` | Documentación técnica y arquitectura. |

Dentro de cada módulo de negocio que lo necesite, utilizar:

- `domain/`: entidades, value objects, invariantes y reglas.
- `application/`: casos de uso, puertos y orquestación.
- `infrastructure/`: implementaciones de repositorios y adaptadores.
- `presentation/`: componentes, controladores y DTOs propios del módulo.

Reglas:

- Las dependencias deben dirigirse hacia el dominio.
- Los componentes visuales nunca deben contener reglas críticas de negocio.
- Los Route Handlers deben ser adaptadores delgados, sin mezclar consultas SQL, validaciones, reglas de negocio y construcción de respuestas.
- Los casos de uso deben poder probarse independientemente de Next.js.

### 4.3 Documentación de código

Documentar las clases, interfaces públicas, funciones y métodos con JSDoc/TSDoc.

Los comentarios de documentación deben explicar:

- Responsabilidad.
- Parámetros relevantes.
- Retornos.
- Errores esperables.
- Reglas de negocio importantes.
- Consideraciones de concurrencia cuando correspondan.

Los summaries y comentarios explicativos serán en español. Los nombres de clases, variables, funciones y endpoints serán en inglés.

No comentar mecánicamente cada línea ni repetir lo que el propio código ya expresa. Priorizar documentación útil, precisa y mantenible.

---

## 5. DISEÑO VISUAL Y EXPERIENCIA DE USUARIO

La plataforma debe sentirse como una herramienta premium para ingenieros de software.

### 5.1 Dirección visual

Usar una estética moderna y profesional, similar a una combinación conceptual de herramientas de desarrollo, plataformas educativas y dashboards SaaS.

Estilo:

- Minimalista.
- Técnico.
- Elegante.
- Alta legibilidad.
- Excelente jerarquía visual.
- Interfaces densas cuando la información lo justifique, pero sin saturación.

Modo oscuro como experiencia principal, con modo claro completamente diseñado.

Paleta sugerida:

- Fondo oscuro azul grafito.
- Superficies en grises fríos.
- Acentos azules y violetas.
- Verde para resultados correctos.
- Ámbar para advertencias.
- Rojo para errores.

Evitar gradientes excesivos, glassmorphism innecesario y decoraciones que no ayuden a aprender.

Utilizar una tipografía legible para interfaz y una monoespaciada para código.

### 5.2 Layout general

En escritorio:

- Sidebar izquierda con navegación principal.
- Barra superior con buscador, progreso y acciones.
- Área central de contenido.
- Panel lateral contextual cuando sea útil.
- Navegación persistente entre secciones.

En dispositivos móviles:

- Sidebar colapsable.
- Navegación compacta.
- Lectura cómoda.
- Ejercicios adaptados a pantallas pequeñas.
- Sin scroll horizontal involuntario.

### 5.3 Componentes reutilizables

Implementar componentes específicos:

`LessonReader`, `CodeEditor`, `CodeExecutionResult`, `InteractiveDiagram`, `ConceptCard`, `KnowledgeCheck`, `QuizQuestion`, `ChallengeDescription`, `InterviewQuestion`, `LearningPath`, `TopicTree`, `Flashcard`, `PerformanceMetric`, `PatternComparison`, `ArchitectureCanvas`, `ExecutionTimeline`, `TestResultPanel`, `ProgressIndicator`, `LearningObjective`, `HintPanel`, `SolutionExplanation`.

Crear un design system coherente, con estados **loading, vacío, error, éxito y deshabilitado**.

### 5.4 Usabilidad

Incluir:

- Navegación por teclado.
- Atajos útiles.
- Buscador global con Ctrl/Cmd + K.
- Navegación anterior/siguiente.
- Tabla de contenidos por lección.
- Marcadores.
- Última posición de lectura.
- Ajuste de tamaño de fuente.
- Pantalla completa para código.
- Paneles redimensionables en laboratorios.
- Accesibilidad WCAG AA como objetivo.
- Respeto a la preferencia de movimiento reducido.
- Estados persistentes cuando sea razonable.

---

## 6. NAVEGACIÓN PRINCIPAL

Crear las siguientes secciones:

1. Dashboard.
2. Rutas de aprendizaje.
3. Biblioteca de conocimientos.
4. Laboratorio de código.
5. Challenges.
6. Patrones y arquitectura.
7. System Design Studio.
8. AI Agents Lab.
9. Database Lab.
10. Interview Arena.
11. Flashcards.
12. Cheatsheets.
13. Estadísticas y progreso.
14. Administración de contenido.
15. Configuración.

La navegación debe poder crecer automáticamente al agregar nuevos módulos educativos.

---

## 7. DASHBOARD PRINCIPAL

Crear un dashboard que responda inmediatamente:

- ¿Qué estoy estudiando?
- ¿Qué debería practicar hoy?
- ¿En qué conocimientos tengo debilidades?
- ¿Qué tan preparado estoy para una entrevista?
- ¿Cuál es mi siguiente ejercicio recomendado?

### Funcionalidades

Mostrar:

- Ruta de aprendizaje activa.
- Porcentaje de avance por temática.
- Lecciones completadas.
- Desafíos resueltos.
- Rendimiento en evaluaciones.
- Conceptos pendientes de repaso.
- Racha de estudio.
- Minutos de estudio.
- Evolución histórica.
- Nivel estimado por habilidad.
- Últimos contenidos visitados.
- Recomendaciones por debilidad.

Botones principales:

- **Continuar estudiando**
- **Practicar para entrevista**
- **Resolver un desafío**

### Diagnóstico inicial

- Implementar una evaluación diagnóstica opcional.
- No suponer que el usuario desconoce programación por no dominar una tecnología específica.
- Permitir declarar experiencia previa en otros lenguajes. Por ejemplo, si domina C# y Java, ofrecer explicaciones comparativas para aprender TypeScript más rápidamente.
- El diagnóstico no debe bloquear la navegación.

---

## 8. MOTOR DE CONTENIDO EDUCATIVO

Este es uno de los componentes más importantes. Quiero una arquitectura extensible que permita agregar contenidos sin modificar la aplicación.

### 8.1 Jerarquía

**Área de conocimiento → Curso → Módulo → Lección → Ejercicio → Evaluación.**

Además, los contenidos podrán tener relaciones transversales mediante etiquetas y prerrequisitos.

### 8.2 Metadatos

Cada lección debe tener, como mínimo:

- ID estable.
- Slug único.
- Título.
- Descripción.
- Área y módulo.
- Nivel de dificultad.
- Objetivos.
- Prerrequisitos.
- Duración estimada.
- Etiquetas.
- Versión del contenido.
- Referencias.
- Ejercicios relacionados.
- Challenges relacionados.
- Preguntas de entrevista.
- Diagramas asociados.
- Resumen final.

Validar estos datos con esquemas tipados.

### 8.3 Contenido en MDX

Utilizar MDX con componentes personalizados para crear lecciones enriquecidas. Permitir incrustar:

- Código editable.
- Diagramas.
- Preguntas.
- Tablas comparativas.
- Simuladores.
- Explicaciones paso a paso.
- Contenido desplegable.
- Advertencias.
- Ejemplos ejecutables.
- Ejercicios.
- Casos reales.

El contenido académico incorporado al repositorio puede almacenarse en archivos versionados.

Los contenidos personalizados que agregue el usuario desde la web deben poder almacenarse en base de datos, con validación y representación segura.

**No ejecutar MDX arbitrario introducido por usuarios.**

### 8.4 Incorporar nuevas temáticas

Diseñar un sistema de registro de cursos y módulos. Al crear un nuevo curso:

- Debe aparecer automáticamente en el catálogo.
- Debe poder vincularse a una ruta de aprendizaje.
- Debe poder declarar prerrequisitos.
- Debe admitir ejercicios y evaluaciones.
- Debe integrar el seguimiento del progreso.
- Debe utilizar los mismos componentes visuales.
- Debe poder incluir laboratorios especializados.

Además:

- Implementar importación y exportación mediante un formato JSON validado.
- Permitir crear borradores de contenidos desde una interfaz administrativa.
- Agregar control de versiones y validaciones para evitar referencias rotas.
- Agregar tests de integridad del catálogo y contenido.

---

## 9. ESTRUCTURA PEDAGÓGICA DE CADA LECCIÓN

Cada lección sustantiva debe seguir este modelo:

1. **¿Qué vas a aprender?** — Objetivos concretos.
2. **¿Qué problema resuelve?** — Explicación motivacional y casos reales.
3. **Concepto y fundamentos** — Explicación rigurosa pero clara.
4. **Representación visual** — Diagrama, animación o flujo cuando mejore la comprensión.
5. **Ejemplo de código** — Código real, explicado y documentado.
6. **Ejemplo incorrecto** — Mostrar una implementación problemática y explicar por qué falla.
7. **Implementación recomendada** — Aplicación de buenas prácticas.
8. **Casos límite** — Errores, concurrencia, excepciones y performance.
9. **Comparación con alternativas** — Cuándo usar cada opción.
10. **Ejercicio interactivo** — Actividad comprobable.
11. **Preguntas de entrevista** — Preguntas para comprobar dominio conceptual.
12. **Resumen y puntos clave** — Conclusiones útiles para repasar.
13. **Referencias** — Enlaces a documentación oficial y fuentes relevantes.

Agregar, cuando corresponda, una comparación con C#/.NET o Java/Spring Boot. Ejemplo: explicar las diferencias entre `Promise<T>` de TypeScript, `Task<T>` de C# y `CompletableFuture<T>` de Java.

No crear páginas que solo tengan el título y tres frases genéricas.

---

## 10. CURSO COMPLETO: TYPESCRIPT

Desarrollar un curso profundo con los siguientes módulos.

### 10.1 Fundamentos avanzados

- TypeScript frente a JavaScript.
- Runtime frente a sistema de tipos.
- Type erasure.
- Type inference.
- Tipado estructural.
- `type` frente a `interface`.
- Union e intersection types.
- Literal types.
- Optional properties.
- `readonly`.
- `unknown`, `any` y `never`.
- `null` y `undefined`.
- Strict null checks.
- Type assertions y riesgos.
- Type narrowing.
- Type predicates.
- Discriminated unions.
- Exhaustiveness checking.

### 10.2 Sistema de tipos avanzado

- Generics.
- Generic constraints.
- `keyof`.
- Indexed access types.
- Mapped types.
- Conditional types.
- Utility types.
- Template literal types.
- Inferencia avanzada.
- Diseño de APIs type-safe.
- Branded types.
- Validaciones en runtime.
- Zod.
- DTOs y contratos tipados.

### 10.3 Asincronía

- Callbacks.
- Promises.
- async/await.
- `Promise.all`.
- `Promise.allSettled`.
- `Promise.race`.
- `Promise.any`.
- Propagación de errores.
- Cancelación con `AbortController`.
- Timeouts.
- Concurrencia controlada.
- Race conditions.
- Reintentos.
- Backoff exponencial.

### 10.4 Diseño y calidad

- Organización de módulos.
- Funciones puras.
- Inmutabilidad.
- Dependency inversion.
- Result pattern.
- Error handling.
- Testing.
- Refactoring.
- Patrones de diseño.
- Anti-patterns.
- Optimización.

### Simuladores obligatorios

1. Comparador visual de tipos.
2. Ejercicios de predicción de compilación.
3. Playground de generics.
4. Simulador de resolución de Promises.
5. Comparador entre C#, Java y TypeScript.
6. Ejercicios de refactoring.
7. Desafíos de tipos avanzados.

---

## 11. CURSO COMPLETO: NODE.JS

### 11.1 Fundamentos internos

- Arquitectura de Node.js.
- V8.
- Event loop.
- Call stack.
- Microtasks.
- Macrotasks.
- Timers.
- `process.nextTick`.
- `setImmediate`.
- Libuv.
- Thread pool.
- Concurrencia frente a paralelismo.
- Operaciones I/O-bound y CPU-bound.
- Worker threads.
- Streams.
- Buffers.
- Backpressure.
- EventEmitter.
- Manejo de memoria.
- Garbage collection.

### 11.2 Backend profesional

- REST APIs.
- Arquitectura por capas.
- Route Handlers.
- Controllers y casos de uso.
- Validación.
- Errores HTTP.
- Middleware.
- Autenticación.
- Autorización.
- Logging estructurado.
- Correlation IDs.
- Rate limiting.
- Timeouts.
- Webhooks.
- Idempotencia.
- Versionado de APIs.
- OpenAPI.
- Testing de integración.

### 11.3 Performance

- Blocking operations.
- Event loop lag.
- Uso de streams.
- Control de concurrencia.
- Uso eficiente de memoria.
- Connection pooling.
- Caching.
- Optimización de consultas.
- Profiling.
- Métricas.
- Load testing.
- Escalabilidad horizontal.

### Simuladores

**Event Loop Visualizer.** Una visualización paso a paso del orden de ejecución. Debe representar:

- Call stack.
- Callbacks.
- Microtask queue.
- Timers.
- Fases relevantes del event loop.

Permitir ejecutar ejemplos y predecir la salida.

**Concurrency Simulator.** Simular 100, 1.000 o 10.000 tareas con distintas estrategias, utilizando un modelo didáctico claramente identificado como simulación. Comparar ejecución secuencial, concurrencia sin límites y concurrencia acotada.

**API Playground.** Construir y probar endpoints, validaciones, errores, headers y contratos.

---

## 12. CURSO COMPLETO: REACT

Incluir:

- Arquitectura de componentes.
- JSX.
- Props.
- Estado.
- Renderizado.
- Reconciliation.
- Virtual DOM y sus límites conceptuales.
- Hooks.
- `useState`.
- `useEffect`.
- `useMemo`.
- `useCallback`.
- `useRef`.
- `useReducer`.
- Custom hooks.
- Context.
- Formularios.
- Controlled vs uncontrolled components.
- Lifting state.
- Composition.
- Render props cuando corresponda.
- Optimización de renders.
- `React.memo`.
- Estado derivado.
- Data fetching.
- Server state vs client state.
- Suspense.
- Error boundaries.
- Testing.
- Accesibilidad.
- Seguridad.
- Arquitectura frontend.

### Laboratorios especiales

- **Render Explorer:** visualizar por qué se renderiza cada componente y qué cambios disparan nuevas actualizaciones.
- **Hooks Playground:** permitir modificar ejemplos con errores frecuentes y corregirlos.
- **Performance Lab:** comparar implementaciones de listas grandes, memoización y manejo de estado. Medir resultados reales cuando sea posible y distinguir las simulaciones de las mediciones.
- **Refactoring Lab:** partir de un componente monolítico con problemas y dividirlo correctamente.

---

## 13. CURSO COMPLETO: NEXT.JS

Cubrir:

- App Router.
- Routing.
- Nested layouts.
- Dynamic routes.
- Route groups.
- Server Components.
- Client Components.
- Rendering.
- Hydration.
- Streaming.
- Suspense.
- Data fetching.
- Caching.
- Revalidation.
- Server Actions.
- Route Handlers.
- Middleware o mecanismos equivalentes vigentes.
- Autenticación.
- Autorización.
- Cookies.
- Sesiones.
- Protección de rutas.
- SEO.
- Metadata.
- Optimización de imágenes.
- Error handling.
- Loading states.
- Despliegue en Vercel.
- Variables de entorno.
- Observabilidad.
- Seguridad.
- Performance.

Además:

- Agregar ejercicios para decidir cuándo un componente debe ejecutarse en cliente o servidor.
- Crear diagramas que representen el flujo de una solicitud desde navegador hasta renderizado.
- Incluir comparaciones con una SPA tradicional de React.

---

## 14. ARQUITECTURA DE SOFTWARE Y PATRONES

Crear una biblioteca visual de patrones de diseño. Cada patrón debe tener:

- Definición.
- Problema que resuelve.
- Motivación.
- Diagrama.
- Ejemplo incorrecto.
- Implementación correcta.
- Ejercicio.
- Beneficios.
- Costos.
- Alternativas.
- Errores frecuentes.
- Casos donde no conviene usarlo.
- Preguntas de entrevista.

### 14.1 Principios fundamentales

SOLID, DRY, KISS, YAGNI, Separation of Concerns, Coupling, Cohesion, Composition, Encapsulation, Abstraction, Dependency Inversion, Dependency Injection, Clean Code, Refactoring, Testing pyramid, Diseño orientado a dominio.

### 14.2 Patrones de diseño

Incluir, al menos:

Strategy, Factory Method, Abstract Factory, Builder, Adapter, Decorator, Facade, Observer, Command, State, Template Method, Chain of Responsibility, Mediator, Proxy, Composite, Repository, Specification, Unit of Work.

No presentar todos los patrones como soluciones universalmente recomendables. Enseñar su aplicación pragmática.

### 14.3 Patrones de arquitectura

Layered Architecture, Clean Architecture, Hexagonal Architecture, Onion Architecture, Modular Monolith, Microservices, Event-Driven Architecture, Event Sourcing, CQRS, Saga, Transactional Outbox, Inbox Pattern, Circuit Breaker, Retry, Bulkhead, Rate Limiting, Cache Aside, Write Through, API Gateway, Backend for Frontend, Strangler Fig, Anti-Corruption Layer, Idempotent Consumer, Dead Letter Queue.

### 14.4 Diagramas obligatorios

Crear diagramas interactivos para:

- Arquitectura hexagonal.
- Clean Architecture.
- Modular Monolith.
- Microservices.
- Event-Driven Architecture.
- CQRS.
- Saga.
- Transactional Outbox.
- Circuit Breaker.
- Comunicación síncrona y asíncrona.
- Capas y dirección de dependencias.

Al seleccionar un elemento del diagrama, mostrar su responsabilidad y ejemplos de implementación.

### 14.5 Comparador de arquitecturas

Permitir comparar dos arquitecturas según: complejidad, escalabilidad, mantenibilidad, latencia, consistencia, costos operativos, facilidad de despliegue, testing, observabilidad y acoplamiento.

Las comparaciones deben explicar los compromisos, **sin inventar valores numéricos universales**.

---

## 15. SYSTEM DESIGN STUDIO

Crear un laboratorio específico para practicar entrevistas de diseño de sistemas.

### 15.1 Temario

Escalabilidad vertical y horizontal, Load balancing, Reverse proxies, Stateless services, CAP theorem, Consistencia fuerte y eventual, Disponibilidad, Replicación, Sharding, Partitioning, Idempotencia, Race conditions, Distributed locking, Mensajería, Retries, Dead Letter Queues, Circuit Breakers, Backpressure, Rate limiting, Webhooks, Multi-tenancy, Autenticación y autorización, Seguridad de APIs, Observabilidad, Disaster recovery, Horizontal scaling, Capacity planning, Estimación de carga, Latencia, Throughput, SLO / SLA / SLI.

### 15.2 Architecture Canvas

Implementar un editor visual con React Flow. El usuario debe poder agregar:

- Cliente web.
- API Gateway.
- Load balancer.
- Backend services.
- PostgreSQL.
- Redis.
- Message queue.
- Workers.
- External APIs.
- Object storage.
- Observability.
- LLM provider.
- Webhook endpoint.
- Scheduler.

Permitir conectar componentes, agregar descripciones y configurar sus propiedades conceptuales. Guardar diagramas. Exportar en imagen o JSON.

### 15.3 Simuladores interactivos

Crear simuladores educativos para:

- Requests distribuidos entre servidores.
- Retries con backoff.
- Mensajes duplicados.
- Mensajes fuera de orden.
- Caída de un servicio.
- Latencia de base de datos.
- Cache hit y cache miss.
- Cache stampede.
- Rate limiting.
- Procesamiento de colas.
- Circuit Breaker.
- Escalado horizontal.
- Deadlocks.
- Consistencia eventual.

Los simuladores deberán mostrar una línea temporal, métricas y cambios visuales. Separar claramente los modelos simplificados de los comportamientos medidos en infraestructura real.

### 15.4 Desafíos de arquitectura

**Challenge: Diseñar un sistema de cobranzas masivas**
- Miles de eventos por día.
- Priorización de deudas.
- Un cliente puede tener varias deudas.
- Evitar cobros duplicados.
- Idempotencia.
- Reintentos.
- Recuperación ante fallos.
- Registro de auditoría.
- Procesamiento asíncrono.

**Challenge: Plataforma multi-tenant de agentes**
- Múltiples empresas.
- Configuraciones independientes.
- Prompts versionados.
- Rollback.
- Políticas específicas.
- Auditoría.
- Aislamiento de datos.
- Miles de conversaciones concurrentes.

**Challenge: Sistema de webhooks confiable**
- Entrega al menos una vez.
- Eventos duplicados.
- Reintentos.
- Fallos temporales.
- Orden de mensajes.
- DLQ.
- Firma y autenticidad.

**Challenge: Orquestador de campañas**
- Ventanas horarias.
- Prioridades.
- Frecuencia de contacto.
- Promesas de pago.
- Diferentes canales.
- Políticas configurables.

Cada desafío debe tener: requerimientos funcionales y no funcionales, preguntas aclaratorias, espacio de diseño, checklist y rúbrica de evaluación.

---

## 16. LLMs Y AGENTES DE INTELIGENCIA ARTIFICIAL

Crear un curso específico y profundamente práctico.

### 16.1 Fundamentos

Qué es un LLM, Tokens, Context window, Temperature, Sampling, Determinismo y variabilidad, Latencia, Costos, Prompt engineering, System prompts, Structured outputs, JSON Schema, Function calling, Tool calling, Hallucinations, Prompt injection, Context management, RAG, Embeddings, Memoria de corto plazo, Memoria persistente, Agentes y workflows, Human in the loop, Guardrails.

### 16.2 Ingeniería de agentes

Configuración, Versionado, Prompts por cliente, Tools permitidas, Model routing, Retries, Timeouts, Fallbacks, State machines, Orquestación, Manejo de errores, Políticas, Evaluaciones, Trazabilidad, Costos por conversación, Observabilidad, Seguridad de herramientas.

### 16.3 AI Agents Lab

Implementar un laboratorio de agentes. Permitir configurar:

- Identidad del agente.
- System prompt.
- Objetivo.
- Herramientas.
- Reglas.
- Políticas.
- Voz como propiedad configurable.
- Versiones.
- Variables.
- Memoria.
- Escenarios de evaluación.

Reglas:

- Implementar un **proveedor local determinista** para practicar sin una API key.
- Si se configura un proveedor LLM real, utilizar una interfaz de proveedor desacoplada y guardar las credenciales exclusivamente en el servidor.
- No simular una respuesta de un modelo real sin indicarlo.

### 16.4 Tool Calling Simulator

Crear herramientas simuladas:

- Consultar deuda.
- Consultar historial.
- Registrar promesa de pago.
- Obtener propuestas permitidas.
- Confirmar pago.
- Programar contacto.
- Registrar rechazo.
- Escalar a operador.

Permitir visualizar:

- Argumentos enviados.
- Validación del esquema.
- Resultado.
- Errores.
- Estado anterior y posterior.
- Tiempo de ejecución.

### 16.5 Memoria

Crear una demostración de cómo un agente conserva contexto entre conversaciones. Ejemplo:

- **Día 1:** el cliente promete pagar el día 15.
- **Día 5:** se intenta generar una nueva campaña.
- El sistema debe consultar la memoria y decidir si la nueva acción es válida.

Explicar la diferencia entre **memoria conversacional**, **estado estructurado del negocio** e **historial de eventos**.

Enseñar cómo manejar información contradictoria y desactualizada.

### 16.6 Evaluaciones de agentes

**Este apartado es prioritario.** Explicar e implementar:

- Test cases.
- Golden datasets.
- Regression suites.
- Evaluación determinista.
- Evaluación semántica.
- LLM as Judge.
- Scoring.
- Ground truth.
- Model drift.
- Prompt regression.
- Evaluaciones de seguridad.
- Evaluaciones de cumplimiento.
- Tool calling correctness.
- Pruebas repetidas.
- Evaluación estadística.
- Control de falsos positivos.
- Comparación de versiones.

### 16.7 Eval Playground

Construir una interfaz donde se puedan comparar dos versiones de un agente (Versión A y Versión B). Ejecutar una suite de casos. Mostrar:

- Casos aprobados.
- Casos fallidos.
- Errores.
- Diferencias.
- Resultados repetidos.
- Variabilidad.
- Costo estimado cuando existan datos reales.
- Latencia medida.
- Criterios de aceptación.

Reglas:

- Distinguir verificaciones deterministas de resultados probabilísticos.
- Permitir configurar un **quality gate** para bloquear una publicación en el laboratorio cuando no se cumplan los criterios.
- No evaluar únicamente por coincidencia literal de textos.

---

## 17. POSTGRESQL Y SQL LAB

Crear un módulo de aprendizaje y práctica de bases de datos relacionales.

### Contenidos

Modelado relacional, Normalización, Desnormalización, Primary keys, Foreign keys, Constraints, Índices B-tree, Índices compuestos, Índices parciales, Índices de cobertura, Selectividad, Query planner, EXPLAIN, EXPLAIN ANALYZE, Joins, Subqueries, CTEs, Window functions, JSONB, UPSERT, Transactions, ACID, Isolation levels, Locks, Deadlocks, MVCC, Concurrencia, Optimistic locking, Pessimistic locking, Pagination, Partitioning, Migrations, Connection pooling, SQL injection, Prepared statements, Query optimization, N+1, Outbox pattern, Idempotencia con constraints.

### SQL Playground

Implementar un editor SQL real utilizando **PGlite** en navegador. Características:

- Base de datos aislada.
- Datasets de ejemplo.
- Editor con syntax highlighting.
- Ejecución de consultas.
- Resultados tabulares.
- Errores comprensibles.
- Reset del dataset.
- Esquema visible.
- Inspección de tablas.
- Ejercicios autocorregibles.
- Soluciones explicadas.

Crear datasets relacionados con: clientes, préstamos, cuotas, pagos, promesas de pago, campañas, agentes y conversaciones.

Incluir ejercicios sobre índices, agregaciones, joins, transacciones y consistencia.

Para temas que requieran características no soportadas adecuadamente por el motor embebido o concurrencia real, proporcionar un laboratorio PostgreSQL externo opcional y explicar la diferencia.

---

## 18. REDIS LAB

Crear un módulo práctico sobre:

Tipos de datos, Strings, Hashes, Sets, Sorted sets, Lists, Streams, TTL, Expiración, Caching, Cache Aside, Cache invalidation, Cache stampede, Rate limiting, Pub/Sub, Redis Streams, Idempotencia, Locks distribuidos y limitaciones, Persistencia, Eviction policies, Redis frente a PostgreSQL, Redis frente a un message broker.

### Simulador

Construir un simulador local de Redis con **reloj virtual** para practicar:

- SET/GET.
- TTL.
- Expiración.
- Incrementos.
- Rate limiting.
- Caché.
- Colisiones.
- Invalidación.
- Cache miss.
- Cache hit.

Debe identificarse explícitamente como un simulador, no como una instancia Redis real.

Agregar laboratorios reales opcionales mediante un adaptador aislado, sin exponer credenciales ni permitir que los ejercicios alteren la caché de producción.

---

## 19. LABORATORIO DE PROGRAMACIÓN

Crear un entorno cómodo para practicar código.

### Características

- Monaco Editor o Sandpack según el ejercicio.
- Syntax highlighting.
- Autocompletado.
- Archivos múltiples cuando sea necesario.
- Plantilla inicial.
- Instrucciones.
- Tests.
- Consola.
- Resultado.
- Pistas progresivas.
- Solución de referencia.
- Explicación posterior.

### Tipos de ejercicios

- Implementar una función.
- Corregir un bug.
- Refactorizar código.
- Implementar un patrón.
- Mejorar performance.
- Corregir tipos de TypeScript.
- Completar un endpoint.
- Corregir un componente React.
- Resolver una query SQL.
- Diseñar un contrato de API.
- Detectar problemas arquitectónicos.
- Completar un workflow.

### Seguridad de ejecución

**Nunca ejecutar código arbitrario del usuario directamente dentro de la aplicación Node.js de producción.** Utilizar:

- Sandpack para escenarios frontend compatibles.
- PGlite para SQL en navegador.
- Vercel Sandbox u otra infraestructura aislada para Node.js real cuando se habilite.

Aplicar límites de ejecución, recursos, tiempo, salida y acceso a red. No entregar secretos a entornos de ejecución no confiables.

### Evaluación

Agregar tests públicos y ocultos. Distinguir:

- Correctitud.
- Casos límite.
- Robustez.
- Complejidad.
- Legibilidad.
- Arquitectura.
- Seguridad.

**No fingir que una solución pasó pruebas si no se ejecutaron realmente.**

---

## 20. CHALLENGES DE ENTREVISTA

Crear un catálogo de desafíos clasificados por: tecnología, dificultad, duración, tema, habilidad y tipo de entrevista.

### Desafíos iniciales obligatorios

1. Implementar un debounce en TypeScript.
2. Implementar un throttle.
3. Implementar un retry con backoff.
4. Implementar un concurrency limiter.
5. Diseñar un Result type.
6. Corregir errores de Promise handling.
7. Diseñar una API REST tipada.
8. Validar requests con Zod.
9. Implementar un webhook idempotente.
10. Detectar condiciones de carrera.
11. Construir un componente React con formularios.
12. Corregir un useEffect problemático.
13. Optimizar renders innecesarios.
14. Diseñar una feature con Server Components.
15. Implementar un repositorio desacoplado.
16. Refactorizar un servicio que viola SOLID.
17. Implementar Strategy.
18. Diseñar un sistema multi-tenant.
19. Diseñar una política de rate limiting.
20. Implementar un modelo de memoria entre conversaciones.
21. Versionar configuraciones de un agente.
22. Diseñar una suite de evals.
23. Resolver una query SQL compleja.
24. Evitar una carrera durante un cobro.
25. Diseñar un sistema de colas con reintentos.

Cada challenge debe contener:

- Enunciado claro.
- Restricciones.
- Criterios de aceptación.
- Starter code cuando corresponda.
- Ejemplos.
- Casos límite.
- Tests.
- Pistas.
- Solución de referencia.
- Análisis de complejidad.
- Alternativas.
- Preguntas de seguimiento.

---

## 21. INTERVIEW ARENA

Crear un simulador de entrevistas técnicas.

### Modos

- **Quick Interview:** preguntas rápidas de 5 a 10 minutos.
- **Technical Deep Dive:** preguntas con seguimiento técnico y razonamiento.
- **Live Coding:** desafío de programación con tiempo configurable.
- **System Design Interview:** un problema abierto con fases:
  1. Aclarar requerimientos.
  2. Identificar restricciones.
  3. Diseñar modelo de datos.
  4. Diseñar componentes.
  5. Explicar flujos.
  6. Evaluar escalabilidad.
  7. Analizar fallos.
  8. Justificar decisiones.
- **AI Engineering Interview:** preguntas sobre agentes, memoria, prompts, herramientas y evaluación.
- **Mock Interview Completa:** una sesión simulada de aproximadamente 45 a 60 minutos, con secciones configurables.

### Evaluaciones

Para cada respuesta:

- Mostrar criterios esperados.
- Permitir autoevaluación.
- Mostrar elementos faltantes.
- Explicar una respuesta sólida.
- Agregar preguntas de seguimiento.
- Registrar puntos débiles.

Si hay integración real con LLM, permitir evaluación asistida y conversación dinámica.

Sin integración LLM, ofrecer preguntas y rúbricas útiles, **sin aparentar una evaluación semántica automática que no existe**.

### Banco de preguntas

Generar un banco inicial amplio y curado de preguntas. Incluir preguntas como:

- ¿Cómo funciona el event loop?
- ¿Cuál es la diferencia entre `Promise.all` y `Promise.allSettled`?
- ¿Cuándo usarías Server Components?
- ¿Qué significa que una API sea idempotente?
- ¿Cómo implementarías un webhook confiable?
- ¿Qué diferencia existe entre CQRS y Event Sourcing?
- ¿Qué problema resuelve el patrón Outbox?
- ¿Cómo versionarías prompts?
- ¿Cómo evaluarías agentes no deterministas?
- ¿Cómo diseñarías un sistema multi-tenant?
- ¿Qué problemas puede producir un índice SQL mal diseñado?
- ¿Qué ocurre con una carrera entre dos transacciones?
- ¿Cómo manejarías una caída parcial de servicios?
- ¿Cómo decidirías entre monolito modular y microservicios?

---

## 22. SISTEMA DE APRENDIZAJE Y MEMORIA

### Flashcards

Implementar tarjetas de estudio con:

- Pregunta.
- Respuesta.
- Categoría.
- Dificultad.
- Etiquetas.
- Historial de repaso.
- Próximo repaso recomendado.

Utilizar un algoritmo documentado de repetición espaciada, como una adaptación de **SM-2**.

### Knowledge Checks

Agregar preguntas al finalizar las lecciones:

- Opción múltiple.
- Selección de varias opciones.
- Verdadero/falso con justificación.
- Ordenar pasos.
- Identificar errores.
- Completar código.
- Predecir resultados.
- Elegir arquitectura.
- Respuesta conceptual.

Explicar por qué cada alternativa es correcta o incorrecta.

### Seguimiento

Guardar:

- Lecciones iniciadas y completadas.
- Tiempo de estudio.
- Respuestas.
- Intentos.
- Challenges.
- Errores frecuentes.
- Nivel de confianza.
- Repasos.
- Última actividad.
- Progreso por habilidad.

### Recomendaciones

Crear un algoritmo **transparente** que sugiera qué practicar. Priorizar:

- Errores recurrentes.
- Temas con baja confianza.
- Repasos pendientes.
- Prerrequisitos faltantes.
- Contenido relevante para la entrevista.

No depender de IA para esta funcionalidad básica.

---

## 23. PLANES DE PREPARACIÓN

Crear rutas listas para utilizar:

- Preparación intensiva de 3 días.
- Preparación de 7 días.
- Preparación de 14 días.
- Preparación de 30 días.
- Plan personalizado.

También crear la **Ruta Full Stack AI Platform Engineer**, con foco en TypeScript, Node.js, React, Next.js, System Design, LLMs y PostgreSQL.

Reglas:

- Cada ruta debe contener objetivos diarios, teoría, ejercicios, challenges y evaluaciones.
- Permitir modificar la disponibilidad horaria.
- Recalcular el plan cuando el usuario no complete una sesión.
- Mostrar estimaciones realistas, no garantizar preparación total en un plazo arbitrario.

---

## 24. CHEATSHEETS Y REFERENCIAS

Crear una biblioteca de consulta rápida. Ejemplos:

TypeScript avanzado, Node.js event loop, Promises, React hooks, Next.js App Router, HTTP status codes, REST API design, PostgreSQL, Redis, SOLID, Design Patterns, Clean Architecture, Hexagonal Architecture, DDD, CQRS, Outbox, Circuit Breaker, System Design, LLM prompting, Tool calling, AI evals, Testing, Git, Docker, AWS.

Cada cheatsheet debe tener ejemplos concisos, explicaciones, errores frecuentes y enlaces a lecciones relacionadas.

Agregar búsqueda y favoritos.

---

## 25. MINI PROYECTO INTEGRADOR

Crear una sección especial llamada: **Build an AI Collections Platform**.

Debe ser un proyecto guiado que reúna lo aprendido.

### Objetivo

Construir una mini plataforma de agentes de cobranzas.

### Funcionalidades

**Configuración de agentes**
- Crear agentes.
- Definir prompts.
- Asignar herramientas.
- Configurar reglas.
- Crear versiones.
- Publicar configuraciones.
- Hacer rollback.

**Gestión de clientes**
- Registrar clientes ficticios.
- Registrar deudas.
- Registrar pagos.
- Registrar promesas.
- Registrar interacciones.

**Orquestación**
- Determinar contactos elegibles.
- Aplicar reglas.
- Priorizar campañas.
- Evitar contactos duplicados.
- Registrar decisiones.
- Simular reintentos.

**Integración**
- REST APIs.
- Webhooks.
- Validación.
- Idempotencia.
- Auditoría.

**Agentes**
- Configuración.
- Tool calling simulado.
- Memoria.
- Evaluaciones.
- Comparación de versiones.

**Arquitectura**
- Multi-tenancy.
- Hexagonal Architecture.
- Persistencia.
- Interfaces.
- Casos de uso.
- Testing.
- Observabilidad.

### Experiencia educativa

- El proyecto estará dividido en hitos.
- Cada hito debe enseñar conceptos antes de pedir implementaciones.
- Al completarlo, el usuario debe haber practicado el stack y los problemas reales de una plataforma de IA.

---

## 26. BIBLIOTECA DE DIAGRAMAS

Crear una sección especializada para explorar diagramas. Soportar:

- Flowcharts.
- Sequence diagrams.
- Component diagrams.
- Deployment diagrams.
- ER diagrams.
- State machines.
- Event-driven workflows.
- Architecture diagrams.

Usar Mermaid y React Flow según las necesidades.

Agregar ejemplos de: Request lifecycle, Event loop, API authentication, OAuth, Circuit Breaker, Transactional Outbox, Saga, CQRS, Event sourcing, Webhooks, Rate limiting, Caching, Agent tool calling, LLM evaluation, Multi-tenant architecture, Next.js rendering, PostgreSQL transaction flow.

Reglas:

- Los diagramas deben ser útiles, no decorativos.
- Agregar zoom, pan y pantalla completa.
- Cuando corresponda, permitir inspeccionar nodos y recorrer una secuencia paso a paso.

---

## 27. ADMINISTRACIÓN Y EXTENSIBILIDAD

Implementar una sección administrativa protegida. Debe permitir, de forma progresiva:

- Crear áreas de conocimiento.
- Crear cursos.
- Crear módulos.
- Crear lecciones.
- Crear preguntas.
- Crear ejercicios.
- Crear challenges.
- Crear flashcards.
- Asociar diagramas.
- Organizar prerrequisitos.
- Definir rutas.
- Editar metadatos.
- Publicar o despublicar contenido.
- Importar y exportar contenido.

Reglas:

- Separar claramente contenidos incorporados al repositorio y contenidos editables almacenados en la base de datos.
- No intentar escribir directamente sobre archivos del repositorio desplegado en Vercel.
- Garantizar que agregar una nueva temática no requiera crear pantallas nuevas salvo que el contenido necesite un laboratorio especializado.
- Documentar cómo crear un curso nuevo.

---

## 28. MODELO DE DATOS

Diseñar un modelo PostgreSQL mantenible. Considerar entidades o tablas equivalentes para:

Users, LearningPaths, Courses, Modules, Lessons, ContentVersions, Topics, Prerequisites, Exercises, Challenges, ChallengeAttempts, QuizQuestions, QuizAttempts, Flashcards, FlashcardReviews, UserProgress, StudySessions, UserNotes, Bookmarks, InterviewSessions, InterviewAnswers, ArchitectureProjects, UserPreferences, CustomContent.

Reglas:

- No crear todas las tablas de manera indiscriminada si algunas entidades pueden representarse mejor mediante contenido estático versionado.
- Definir relaciones, índices, constraints y claves únicas razonables.
- No usar Redis como base primaria de datos del usuario.
- Usar transacciones donde se requiera consistencia.
- Asegurar que las escrituras idempotentes no creen registros duplicados.
- Preparar migraciones y datos iniciales.

---

## 29. AUTENTICACIÓN Y PROGRESO

Como la plataforma será inicialmente personal, evitar añadir complejidad innecesaria.

### Modo invitado

Permitir explorar contenido, ejecutar ejercicios compatibles y guardar progreso local sin configurar servicios externos.

### Modo autenticado

- Permitir login mediante GitHub o un proveedor compatible cuando esté configurado.
- Guardar el progreso en PostgreSQL.
- Estudiar la sincronización entre progreso local y cuenta autenticada, evitando duplicados.
- Nunca exponer información privada de otros usuarios.
- Utilizar autenticación y autorización reales.
- No confiar exclusivamente en controles visuales del frontend para proteger acciones administrativas.

---

## 30. ASISTENTE DE ESTUDIO CON IA

Agregar un módulo opcional llamado **AI Study Mentor**. Debe integrarse a través de un proveedor intercambiable.

Funcionalidades:

- Explicar conceptos.
- Responder dudas sobre una lección.
- Crear preguntas de seguimiento.
- Dar pistas.
- Explicar errores.
- Simular entrevistas.
- Comparar alternativas arquitectónicas.
- Proponer ejercicios adicionales.
- Analizar soluciones de código.

Reglas:

- El asistente debe intentar enseñar antes de revelar soluciones completas.
- Debe poder utilizar el contexto de la lección actual y el progreso del usuario cuando este lo autorice.
- No ejecutar automáticamente código generado por el modelo en producción.
- Agregar límites de uso, control de costos, manejo de errores y protección de credenciales.
- Si no hay API key, la plataforma debe seguir funcionando y los laboratorios deterministas deben permanecer disponibles.

---

## 31. TESTING Y CALIDAD

Implementar una estrategia de pruebas realista.

### Unit Tests

Reglas de negocio, casos de uso, validadores, algoritmos de repaso, cálculo de progreso, evaluación determinista, recomendaciones, contratos importantes.

### Integration Tests

Repositorios, APIs, persistencia, autenticación, integridad de contenido, adaptadores importantes.

### Component Tests

Formularios, navegación, quiz, flashcards, editor, resultados, componentes interactivos.

### E2E (Playwright)

1. Abrir dashboard.
2. Entrar en una ruta.
3. Completar una lección.
4. Resolver un ejercicio.
5. Consultar el progreso.
6. Ejecutar SQL.
7. Guardar un diagrama.
8. Realizar un simulacro de entrevista.
9. Agregar contenido personalizado.
10. Verificar controles de acceso.

Agregar tests de integridad del catálogo y validación de frontmatter.

---

## 32. SEGURIDAD

Implementar:

- Validación de entradas.
- Autorización por operación.
- Cookies seguras.
- Protección CSRF cuando corresponda.
- Prevención de XSS.
- Sanitización de contenido no confiable.
- Consultas SQL parametrizadas.
- Rate limiting en endpoints sensibles.
- Protección de credenciales.
- Políticas de ejecución aislada.
- Manejo seguro de errores.
- Límites de tamaño de requests.
- Límites de ejecución.
- Protección contra abuso de servicios de IA.
- Manejo de secretos mediante variables de entorno.
- Redacción de datos sensibles en logs.

Los ejercicios de programación nunca deben acceder a las credenciales de la plataforma.

No ejecutar SQL proporcionado por usuarios contra la base de datos principal.

---

## 33. PERFORMANCE Y OBSERVABILIDAD

Optimizar: tiempo de carga, bundle size, renderizados innecesarios, carga de editores pesados, carga de diagramas, consultas a base de datos, uso de índices, caching, navegación, accesibilidad, uso de memoria.

Reglas:

- Cargar Monaco, Sandpack y React Flow de forma diferida cuando sea útil.
- Preferir Server Components para contenido que no requiere interactividad cliente.
- No convertir toda la aplicación en Client Components.
- Agregar logging estructurado en backend.
- Incluir métricas útiles para diagnosticar errores y cuellos de botella.
- No registrar información sensible innecesaria.
- Establecer un objetivo de buen rendimiento en Lighthouse y Core Web Vitals, validado mediante mediciones reales.

---

## 34. EXPERIENCIAS INTERACTIVAS ADICIONALES

Incluir, cuando estén implementados sus fundamentos:

- **Code Comparison:** comparar dos implementaciones lado a lado con diferencias resaltadas.
- **Find the Bug:** presentar código defectuoso y pedir identificar la causa.
- **What Happens Next?:** mostrar un fragmento de código y preguntar qué sucede al ejecutarlo.
- **Architecture Decision Game:** presentar un problema y varias alternativas arquitectónicas. Pedir justificar la decisión.
- **Performance Challenge:** solicitar optimizar una implementación conservando su comportamiento.
- **Refactoring Workshop:** presentar un módulo con problemas de diseño e ir mejorándolo por etapas.
- **Error Explorer:** mostrar errores reales habituales, stack traces y causas posibles.
- **Explain It Like an Interview:** pedir una respuesta breve y técnicamente precisa, con rúbrica.
- **Concept Connections:** representar cómo se relacionan conceptos de distintas áreas.
- **Cross-Language Comparison:** mostrar equivalencias y diferencias entre TypeScript, C# y Java.
- **Production Incident Simulator:** plantear un incidente ficticio con logs, métricas y pistas. El usuario debe investigar, formar hipótesis y proponer una solución.

---

## 35. CONTENIDO INICIAL Y CALIDAD EDUCATIVA

No generar únicamente un catálogo de títulos. La primera versión debe incluir contenido académico real y útil.

### Objetivo de contenido inicial

| Elemento | Mínimo |
|---|---|
| Catálogo de temáticas y prerrequisitos | Completo |
| Lecciones sustantivas (distribuidas entre áreas principales) | 40 |
| Challenges con soluciones verificables o rúbricas | 25 |
| Preguntas de evaluación originales | 60 |
| Flashcards | 30 |
| Diagramas relevantes | 12 |
| Simuladores o laboratorios funcionales | 5 |
| Escenarios de System Design | 5 |
| Ruta de preparación de 7 días operativa | 1 |
| Proyecto integrador dividido en hitos | 1 |

Reglas:

- El contenido no debe ser relleno para alcanzar cantidades.
- Si el trabajo requiere varias fases, implementar primero un conjunto menor pero completamente funcional y documentar qué contenido queda pendiente, continuando después con el catálogo restante.
- Para cada módulo creado, garantizar calidad y profundidad antes de marcarlo como finalizado.
- Los ejemplos deben ser originales y técnicamente correctos.
- Utilizar la documentación oficial para verificar aspectos que puedan cambiar con nuevas versiones.

---

## 36. PLAN DE IMPLEMENTACIÓN

La aplicación es amplia. Organizar el desarrollo en fases ejecutables, con entregables verificables. No dedicar todo el esfuerzo inicial al diseño visual dejando el aprendizaje sin funcionamiento.

### Fase 1 — Fundaciones

- [x] Crear proyecto Next.js.
- [x] Configurar TypeScript estricto.
- [x] Instalar dependencias.
- [x] Configurar arquitectura modular.
- [x] Configurar estilos y componentes.
- [x] Configurar testing.
- [x] Crear layout principal.
- [x] Crear navegación.
- [x] Crear dashboard básico.
- [x] Crear motor de contenido MDX.
- [x] Crear registro de cursos.
- [x] Crear primera ruta educativa.
- [x] Crear primera lección real.

**Resultado:** una plataforma navegable y funcional.

### Fase 2 — Aprendizaje

- [x] Lector de lecciones.
- [x] Diagramas.
- [x] Ejemplos.
- [x] Quiz.
- [x] Flashcards.
- [x] Progress tracking.
- [x] Buscador.
- [x] Notas.
- [x] Bookmarks.
- [x] Rutas de aprendizaje.

**Resultado:** ya debe poder utilizarse diariamente para estudiar.

### Fase 3 — Laboratorios

- [x] Editor de código.
- [x] Sandpack.
- [x] Playground de TypeScript.
- [x] SQL Playground.
- [x] Corrección de ejercicios.
- [x] Tests.
- [x] Challenges.
- [x] Guardado de intentos.

**Resultado:** plataforma útil para practicar programación.

### Fase 4 — Arquitectura y entrevistas

- [x] System Design Studio.
- [x] React Flow.
- [x] Pattern Library.
- [x] Architecture Challenges.
- [x] Interview Arena.
- [x] Simulaciones.
- [x] Rúbricas.

**Resultado:** preparación avanzada.

### Fase 4.5 — Teoría de los cursos

Agregada a pedido del usuario después de la Fase 4: las herramientas existen, pero los cursos necesitan la teoría
completa para aprender desde cero (para alguien que ya programa) antes de practicar.

- [x] Módulo de introducción en cada curso: qué es, para qué sirve, sintaxis básica y ejemplos (ADR-0008).
- [x] TypeScript.
- [x] Node.js.
- [x] React.
- [x] Next.js.
- [x] LLMs y agentes de IA.
- [x] PostgreSQL.
- [x] Redis.
- [x] Arquitectura de software.
- [x] System Design.
- [x] Verificación automática de diagramas y del mínimo de calidad de cada lección.

Cada lección: teoría explicada a fondo, diagramas, ejemplos de código, comparación con C# y Java cuando aplica,
errores frecuentes, knowledge checks y preguntas de entrevista.

**Resultado:** cursos completos de introducción y teoría, con al menos 40 lecciones sustantivas (§35).

### Fase 5 — Agentes IA

- [ ] Agent configuration.
- [ ] Versionado.
- [ ] Tool calling simulado.
- [ ] Memory.
- [ ] Evals.
- [ ] Comparación de agentes.
- [ ] AI Study Mentor opcional.

**Resultado:** laboratorio de ingeniería de agentes.

### Fase 6 — Persistencia y administración

- [x] PostgreSQL.
- [ ] Autenticación.
- [ ] Sincronización.
- [ ] Contenido personalizado.
- [ ] Administración.
- [ ] Importación/exportación.
- [ ] Seguridad.
- [ ] Optimización.

**Resultado:** plataforma persistente y extensible.

### Fase 7 — Producción

- [ ] Tests completos.
- [ ] Validaciones.
- [ ] Revisión de performance.
- [ ] Documentación.
- [ ] Configuración Vercel.
- [ ] Variables de entorno.
- [ ] Migraciones.
- [ ] CI/CD.
- [ ] Despliegue.

**Resultado:** aplicación desplegable y mantenible.

El orden podrá ajustarse si existe una dependencia técnica justificada.

---

## 37. ENTREGABLES TÉCNICOS

1. Código fuente completo.
2. Configuración de proyecto.
3. Arquitectura documentada.
4. README profesional.
5. Documentación de instalación.
6. Documentación de desarrollo.
7. Guía de despliegue en Vercel.
8. Ejemplo de variables de entorno sin secretos.
9. Migraciones de base de datos.
10. Scripts de inicialización.
11. Datos iniciales.
12. Guía para agregar cursos.
13. Guía para crear ejercicios.
14. Diagramas de arquitectura.
15. Tests automatizados.
16. Pipeline CI.
17. Registro de decisiones arquitectónicas relevantes.
18. Lista explícita de funcionalidades implementadas y pendientes.

Documentar las decisiones técnicas, especialmente cuando una solución simple sea preferible a una arquitectura más compleja.

---

## 38. CRITERIOS DE ACEPTACIÓN

La implementación será satisfactoria cuando:

- [ ] La aplicación inicie correctamente.
- [ ] El build finalice sin errores.
- [ ] El type checking pase.
- [ ] Los tests implementados pasen.
- [ ] La navegación funcione.
- [ ] Existan lecciones reales.
- [ ] Se puedan responder quizzes.
- [ ] Se registre progreso.
- [ ] Se puedan ejecutar ejercicios compatibles.
- [ ] El SQL Playground ejecute consultas reales.
- [ ] Los diagramas funcionen.
- [ ] Se puedan resolver challenges.
- [ ] Se pueda practicar una entrevista.
- [ ] El catálogo sea extensible.
- [ ] La estructura respete las dependencias arquitectónicas.
- [ ] Los endpoints no contengan lógica de negocio compleja.
- [ ] El sistema maneje errores y estados vacíos.
- [ ] La interfaz sea responsive.
- [ ] El proyecto pueda desplegarse en Vercel.
- [ ] La documentación explique cómo agregar contenido.
- [ ] No existan botones decorativos que aparenten funcionalidades inexistentes.

Los módulos que necesiten claves de API o servicios externos deben tener una alternativa funcional o un estado explícito de configuración pendiente.

No introducir datos ficticios que se presenten como métricas reales.

---

## 39. INSTRUCCIONES FINALES DE EJECUCIÓN

Actuar como responsable técnico del proyecto. No limitarse a recomendar una arquitectura ni a producir mockups. **Implementar la aplicación.**

Antes de empezar a escribir código:

1. Revisar el repositorio existente si lo hay.
2. Definir la arquitectura.
3. Identificar los módulos.
4. Elegir las dependencias.
5. Diseñar el modelo de contenido.
6. Definir los contratos principales.
7. Establecer un plan de implementación.
8. Identificar los riesgos técnicos.

Después comenzar a implementar.

Reglas de ejecución:

- Priorizar vertical slices completamente funcionales.
- No crear cientos de archivos vacíos ni abstracciones sin uso.
- No incluir TODOs silenciosos que aparenten funcionalidad terminada.
- No inventar resultados de tests.
- No sacrificar calidad por volumen de código.
- No agregar dependencias que no sean necesarias.
- No hacer reescrituras completas cuando un cambio localizado sea suficiente.
- Al finalizar cada fase, verificar el funcionamiento y registrar el estado.
- Cuando una funcionalidad no pueda implementarse por limitaciones de infraestructura, explicar concretamente la limitación y preparar una alternativa viable.
- Para decisiones no críticas, elegir una opción razonable y documentarla, sin bloquear el desarrollo.

---

## PRINCIPIO CENTRAL

Esta plataforma no tiene que ser únicamente una web bonita que explique programación.

Debe ser una herramienta de aprendizaje técnico profundo, interactiva, extensible y diseñada con la misma calidad arquitectónica que pretende enseñar.

Quiero poder abrirla todos los días, elegir un tema, comprenderlo, ver diagramas, ejecutar ejemplos, resolver problemas, cometer errores, recibir explicaciones, repasar conocimientos y medir mi preparación para entrevistas.

La primera especialización será **Full Stack AI Platform Engineering**.

La arquitectura debe permitir incorporar fácilmente nuevas especializaciones en el futuro, como Java, Spring Boot, .NET, Go, Kubernetes, AWS, seguridad, algoritmos o cualquier otra temática técnica.

Empezar por implementar una primera experiencia completa y funcional, y desarrollar el resto siguiendo el plan definido, manteniendo coherencia arquitectónica, funcionalidad verificable y contenido educativo de calidad.
