# Plan: ejemplos con dominios variados en todo el contenido

**Objetivo:** que la academia sea genérica. Hoy los ejemplos de las 60 lecciones originales (y de varios challenges,
patrones y desafíos de arquitectura) usan casi siempre el dominio de cobranzas (deudas, deudores, promesas de pago).
Hay que reemplazarlos por dominios variados, conservando exactamente lo que cada ejemplo enseña.

## Alcance medido (2026-11-20)

| Contenido                                             | Archivos con el dominio                            | Menciones |
| ----------------------------------------------------- | -------------------------------------------------- | --------- |
| Lecciones de los 9 cursos originales                  | 60                                                 | ~1.050    |
| Challenges (código, React, SQL, diseño)               | ~10                                                | —         |
| Dataset y ejercicios del SQL Lab                      | dataset + 6 ejercicios                             | —         |
| Patrones y diagramas de arquitectura                  | ~8                                                 | —         |
| Desafíos de System Design del Studio                  | 4 (`mass-collections`, `campaign-orchestrator`, …) | —         |
| AI Agents Lab (agente, herramientas y golden dataset) | código de dominio                                  | —         |

Las lecciones más cargadas: `typescript/diseno-errores-y-testing` (67), `typescript/runtime-vs-sistema-de-tipos`,
`typescript/apis-type-safe`, `typescript/uniones-y-narrowing`, `react/composicion-y-estado-compartido` y
`nextjs/introduccion-a-nextjs` (45 cada una).

## Dominios por curso

Un dominio principal por curso, para que los ejemplos de un mismo curso sean coherentes entre lecciones, y variedad
entre cursos:

| Curso                    | Dominio principal                            | Ejemplos típicos                                                      |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------------------- |
| TypeScript               | E-commerce                                   | Productos, carrito, pedidos, cupones, `Result` de checkout            |
| Node.js                  | Pagos y webhooks                             | Cobros, reembolsos, webhooks del proveedor, idempotencia              |
| React                    | Tienda y panel de pedidos                    | Listado de productos, filtros, carrito, formularios de checkout       |
| Next.js                  | Marketplace                                  | Catálogo, fichas de producto, panel del vendedor                      |
| Arquitectura de software | Logística y envíos                           | Envíos, tarifas por transportista, seguimiento                        |
| System Design            | Varios (ya cubiertos por los casos clásicos) | Chat, feed, notificaciones, pagos                                     |
| LLMs y agentes           | Soporte al cliente                           | Agente que consulta pedidos, gestiona devoluciones y escala a humanos |
| PostgreSQL               | Reservas (hotel o turnos)                    | Habitaciones, reservas sin solapamiento, pagos                        |
| Redis                    | Notificaciones y sesiones                    | Rate limiting, caché de catálogo, colas de envíos                     |

El dominio de cobranzas puede quedar como **un** ejemplo más entre otros (por ejemplo, en un caso de System Design),
pero no como hilo conductor.

## Reglas para reescribir sin romper el contenido

1. **Mismo concepto, otro dominio**: cada ejemplo tiene que enseñar exactamente lo mismo (la condición de carrera
   sigue siendo una condición de carrera, la unión discriminada sigue cubriendo los mismos casos).
2. **Knowledge checks**: se reescriben pregunta, opciones y explicaciones juntas, y se mantiene cuál es la correcta.
   Los IDs no cambian, para no perder el progreso guardado de los usuarios.
3. **IDs y slugs estables**: lecciones, challenges y ejercicios mantienen sus IDs. Los challenges cuyo slug nombra el
   dominio (`sql-broken-promises`, `mass-collections`) se renombran con redirección o se reemplazan por uno nuevo,
   documentando la decisión.
4. **Código verificable**: los challenges de código se validan con sus tests (soluciones que pasan, starters que
   fallan); el SQL Lab con su test, que ejecuta cada solución contra el dataset real.
5. **Una lección por vez**, revisada completa: no reemplazos automáticos de palabras, porque cambian el sentido de los
   ejemplos.

## Orden de trabajo (por lotes, cada uno con commit y push)

1. **TypeScript** (11 lecciones): el curso más cargado y la base de los ejemplos de otros cursos.
2. **React y Next.js** (12 lecciones).
3. **Node.js** (9 lecciones).
4. **PostgreSQL**: lecciones + dataset del SQL Lab + ejercicios + challenge SQL, juntos (comparten datos).
5. **Arquitectura de software, Redis y System Design** (lecciones restantes).
6. **LLMs y agentes** + AI Agents Lab (el agente de ejemplo y su golden dataset cambian a soporte al cliente).
7. **Challenges, patrones y desafíos del Studio** con dominio de cobranzas.
8. Barrido final: `grep` de términos del dominio, revisión de README, STATUS y MASTER_PROMPT.

## Verificación por lote

- `docker compose run --rm app pnpm check` (incluye validación de contenido, tests de challenges y SQL, y build).
- E2E (`docker compose --profile e2e run --rm e2e`): algunos tests buscan textos de los ejemplos actuales y se
  actualizan en el mismo lote.
- Revisión visual de las lecciones modificadas en el build de producción local.
