# Plan: ejemplos con dominios variados en todo el contenido

**Objetivo:** que la academia sea genérica y que **cualquier curso, estudiado por separado, exponga a muchos tipos de
problemas reales**. Quien estudie un solo lenguaje tiene que terminar con ideas de e-commerce, pagos, logística,
reservas, mensajería, contenido, SaaS y más, no con un único dominio.

Hoy los ejemplos de las 60 lecciones originales (y de varios challenges, patrones y desafíos de arquitectura) usan
casi siempre el dominio de cobranzas. Hay que reemplazarlos por ejemplos variados, conservando exactamente lo que cada
ejemplo enseña.

## Alcance medido (2026-11-20)

| Contenido                                             | Archivos con el dominio                            | Menciones |
| ----------------------------------------------------- | -------------------------------------------------- | --------- |
| Lecciones de los 9 cursos originales                  | 60                                                 | ~1.050    |
| Challenges (código, React, SQL, diseño)               | ~10                                                | —         |
| Dataset y ejercicios del SQL Lab                      | dataset + 6 ejercicios                             | —         |
| Patrones y diagramas de arquitectura                  | ~8                                                 | —         |
| Desafíos de System Design del Studio                  | 4 (`mass-collections`, `campaign-orchestrator`, …) | —         |
| AI Agents Lab (agente, herramientas y golden dataset) | código de dominio                                  | —         |
| Preguntas, flashcards y cheatsheets                   | algunos                                            | —         |

Las lecciones más cargadas: `typescript/diseno-errores-y-testing` (67), `typescript/runtime-vs-sistema-de-tipos`,
`typescript/apis-type-safe`, `typescript/uniones-y-narrowing`, `react/composicion-y-estado-compartido` y
`nextjs/introduccion-a-nextjs` (45 cada una).

Los 4 cursos nuevos de lenguajes (Java, Python, Go y .NET) no usan cobranzas, pero se apoyan mucho en pedidos y
productos: también entran en la revisión para respetar la misma variedad.

## Principio: variedad dentro de cada curso, no un dominio por curso

**No hay un dominio asignado a cada curso.** Cada curso usa varios dominios, y en cada lección se elige el que mejor
explica el concepto en ese momento. Los cursos más generales (arquitectura de software, patrones, System Design) son
donde más se mezclan: muestran el mismo concepto en varios dominios a la vez.

### Catálogo de dominios

| Dominio                     | Entidades de referencia (nombres ficticios, sin marcas reales)                          |
| --------------------------- | --------------------------------------------------------------------------------------- |
| E-commerce y retail         | Producto, catálogo, carrito, pedido, stock, cupón, devolución                           |
| Pagos y fintech             | Pago, reembolso, billetera, saldo, transferencia, ledger, webhook del proveedor         |
| Logística y envíos          | Envío, transportista, tarifa, seguimiento, depósito, ruta                               |
| Reservas                    | Hotel (habitación, estadía), turnos (agenda, profesional), vuelos (asiento)             |
| Mensajería y notificaciones | Conversación, mensaje, canal, plantilla, preferencia, push                              |
| Contenido y redes sociales  | Post, feed, seguidor, comentario, video, reproducción                                   |
| SaaS B2B multi-tenant       | Organización (tenant), usuario, rol, suscripción, plan, factura                         |
| Educación                   | Curso, inscripción, evaluación, calificación, certificado                               |
| Salud                       | Turno médico, paciente, historia clínica (ideal para ejemplos de privacidad y permisos) |
| Movilidad                   | Viaje, conductor, flota, ubicación, tarifa dinámica                                     |
| IoT y telemetría            | Dispositivo, sensor, lectura, alerta, serie de tiempo                                   |
| Juegos                      | Partida, ranking, matchmaking, inventario                                               |
| Soporte al cliente y CRM    | Ticket, agente, SLA, escalamiento, conversación                                         |
| Cobranzas                   | Deuda, promesa de pago, campaña (queda como **un** dominio más, no como hilo conductor) |

### Reglas de distribución

1. **Cada curso usa al menos 5 dominios distintos**, y ninguno aparece en más del ~30 % de sus ejemplos.
2. **Cada lección tiene a lo sumo un ejemplo conductor** (para no cambiar de contexto en cada párrafo) más ejemplos
   cortos de otros dominios cuando aportan. Dentro de un curso, el ejemplo conductor **rota**: el mismo dominio no
   conduce dos lecciones seguidas ni más de dos lecciones por curso.
3. **El dominio se elige por el concepto, no por el curso**: se usa el escenario donde el problema aparece de forma
   más natural y fácil de entender (ver la guía de abajo). Ningún concepto queda atado siempre al mismo dominio en
   todos los cursos: si en TypeScript las uniones discriminadas se explican con estados de un pedido, en C# se usan
   estados de un viaje o de un turno.
4. **Cursos generales con ejemplos comparados**: en arquitectura de software, patrones y System Design, cada concepto
   importante muestra **dónde aparece en varios dominios** (por ejemplo, "idempotencia: cobros, inscripciones,
   webhooks de envíos") y los ejercicios rotan de dominio.
5. **Se usa un único dominio sólo cuando es necesario**, y se documenta por qué. Casos previstos:
   - **SQL Lab**: un solo dataset compartido por todos los ejercicios (ver lote 4).
   - **AI Agents Lab**: el agente necesita un escenario concreto con herramientas y casos de evaluación (ver lote 5).
   - **Un caso de estudio o un challenge**: cada uno es un único escenario por definición, pero el conjunto de casos y
     challenges tiene que ser variado.
6. **Vocabulario coherente**: las entidades de cada dominio usan siempre los mismos nombres (tabla de arriba), así
   los ejemplos de distintas lecciones se reconocen entre sí.
7. **Sin marcas ni empresas reales**, nombres ficticios, y datos personales sólo en ejemplos que enseñan a protegerlos.

### Guía: conceptos y escenarios donde aparecen de forma natural

Son sugerencias para elegir rápido un buen ejemplo, no asignaciones. Cada concepto tiene varias opciones para poder
rotar entre cursos.

| Concepto                                  | Escenarios naturales                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Uniones discriminadas, máquinas de estado | Pedido, viaje, turno médico, ticket de soporte, envío                             |
| Validación de datos externos              | Formulario de checkout, webhook de pagos, lectura de un sensor, inscripción       |
| Errores esperables y `Result`             | Stock insuficiente, asiento ocupado, saldo insuficiente, cupo de curso lleno      |
| Condiciones de carrera y concurrencia     | Último producto en stock, último asiento, saldo de billetera, cupo de inscripción |
| Idempotencia                              | Cobro, webhook de un transportista, inscripción, envío de una notificación        |
| Caching                                   | Catálogo, perfil de usuario, feed, tarifas de envío                               |
| Rate limiting                             | API pública de un SaaS, login, envío de SMS, matchmaking                          |
| Streams y backpressure                    | Telemetría IoT, exportación de reportes, subida de video, logs                    |
| Colas y procesamiento asíncrono           | Notificaciones, procesamiento de video, facturación mensual, envíos               |
| Joins, agregaciones y window functions    | Ventas por día, ranking de un juego, métricas de un SaaS, ocupación hotelera      |
| Rangos y restricciones de no solapamiento | Reservas de hotel, agenda de turnos                                               |
| Multi-tenancy y autorización              | SaaS B2B, plataforma educativa, clínica con varios consultorios                   |
| Eventos y sagas                           | Pedido → pago → envío, reserva → pago → confirmación                              |
| Tiempo real                               | Chat, seguimiento de un viaje, tablero de un partido                              |
| Agentes y herramientas                    | Soporte al cliente, agenda de turnos, asistente de compras                        |

## Reglas para reescribir sin romper el contenido

1. **Mismo concepto, otro escenario**: cada ejemplo tiene que enseñar exactamente lo mismo (la condición de carrera
   sigue siendo una condición de carrera, la unión discriminada sigue cubriendo los mismos casos).
2. **Knowledge checks**: se reescriben pregunta, opciones y explicaciones juntas, y se mantiene cuál es la correcta.
   Los IDs no cambian, para no perder el progreso guardado de los usuarios.
3. **IDs y slugs estables**: lecciones, challenges y ejercicios mantienen sus IDs. Los slugs que nombran el dominio
   (`sql-broken-promises`, `mass-collections`, `campaign-orchestrator`) se reemplazan por contenido nuevo con otro slug
   y se documenta la decisión.
4. **Código verificable**: los challenges de código se validan con sus tests (soluciones que pasan, starters que
   fallan); el SQL Lab con su test, que ejecuta cada solución contra el dataset real.
5. **Una lección por vez**, revisada completa: no se hacen reemplazos automáticos de palabras, porque cambian el
   sentido de los ejemplos.

## Cómo se trabaja cada lote

1. **Tabla de rotación del lote**: antes de escribir, una tabla lección → ejemplo conductor y ejemplos cortos, que
   cumple las reglas de distribución. Se incluye en la respuesta para que puedas revisarla.
2. Reescritura lección por lección.
3. **Reporte de distribución**: un script (`scripts/domain-report.mjs`, ejecutado en Docker) cuenta por lección y
   por curso los términos de cada dominio y marca los cursos que no cumplen las reglas (menos de 5 dominios o uno por
   encima del ~30 %). El reporte se adjunta al cerrar el lote. Desde el lote 6, la palabra "tenant" no cuenta como dominio
   SaaS: es el concepto técnico de multi-tenancy (y el tema de una lección de System Design), presente en cualquier
   dominio. SaaS se detecta por suscripciones, facturas y organizaciones.
4. Verificación (abajo), commit y push.

## Orden de trabajo (por lotes, cada uno con commit y push)

0. **Base**: script de reporte de distribución y reporte inicial.
1. **TypeScript** (11 lecciones): el curso más cargado.
2. **React y Next.js** (12 lecciones).
3. **Node.js** (9 lecciones).
4. **PostgreSQL + SQL Lab**: lecciones, dataset, ejercicios y challenge SQL juntos, porque comparten datos. El dataset
   pasa a ser un **marketplace** con tablas de varios dominios relacionados (catálogo y pedidos, pagos, envíos, reseñas
   y tickets de soporte) más un esquema chico de **reservas** para los ejercicios de rangos y no solapamiento. Así los
   ejercicios rotan de escenario sin perder los joins entre tablas.
5. **Redis + LLMs y agentes + AI Agents Lab**: el agente de ejemplo pasa de cobranzas a soporte al cliente de un
   comercio (consulta pedidos, envíos, pagos y devoluciones, y escala a una persona). Si el código del lab lo permite
   sin rehacerlo, se agregan escenarios seleccionables (por ejemplo, agenda de turnos) con su golden dataset.
6. **Arquitectura de software + System Design** (lecciones): ejemplos comparados en varios dominios en cada concepto.
7. **Patrones originales, challenges, desafíos del Studio, preguntas, flashcards y cheatsheets** que todavía usan
   cobranzas. `mass-collections` y `campaign-orchestrator` se reemplazan por desafíos de otros dominios.
8. **Cursos de Java, Python, Go y .NET**: revisión de la rotación, porque hoy se apoyan mucho en pedidos y productos.
9. **Barrido final**: reporte de distribución de toda la plataforma, búsqueda de términos de cobranzas y revisión de
   README, STATUS y MASTER_PROMPT.

## Verificación por lote

- `docker compose run --rm app pnpm check` (incluye validación de contenido, tests de challenges y SQL, y build).
- E2E (`docker compose --profile e2e run --rm e2e`): algunos tests buscan textos de los ejemplos actuales y se
  actualizan en el mismo lote.
- Reporte de distribución de dominios del lote.
- Revisión visual de las lecciones modificadas en el build de producción local.
