---
id: iq.n-plus-one
format: quick
question: "¿Qué es el problema N+1 y cómo lo resolverías?"
expectedPoints:
  - id: definition
    point: "Una consulta trae N filas y luego se hace una consulta adicional por cada una: N+1 viajes a la base."
  - id: cause
    point: "Suele aparecer con ORMs y carga perezosa de relaciones, o con un await dentro de un bucle."
  - id: fix-join
    point: "Se resuelve con un JOIN o una consulta por lote (WHERE id = ANY($1)) y agrupando en memoria."
  - id: detect
    point: "Se detecta contando consultas por request (logs, APM, tests) porque cada consulta individual parece rápida."
followUps:
  - "¿Qué es un DataLoader y cuándo lo usarías?"
  - "¿Cuándo un JOIN grande es peor que dos consultas?"
commonMistakes:
  - "Optimizar cada consulta individual sin mirar cuántas se ejecutan."
  - "Resolverlo con Promise.all de N consultas: siguen siendo N viajes."
relatedLessons: []
relatedPatterns: ["repository"]
---

El problema **N+1** ocurre cuando se obtiene una lista (1 consulta: 50 clientes) y luego, por cada elemento, otra
consulta (50 consultas para los pedidos de cada uno). Cada consulta es rápida, pero la latencia de red y la carga
sobre la base se multiplican con N.

Aparece típicamente con **carga perezosa** de relaciones en ORMs o con un `await` dentro de un `for`.

Se resuelve trayendo los datos relacionados en **una o pocas consultas**: un `JOIN` (o la carga ansiosa del ORM), o
una consulta por lote `SELECT ... WHERE customer_id = ANY($1)` y agrupando en memoria. En APIs GraphQL, un DataLoader
agrupa automáticamente las cargas de un mismo tick.

Se **detecta** contando consultas por request en logs o APM, o con tests que verifican la cantidad de consultas.
`Promise.all` sobre N consultas no lo resuelve: reduce la latencia total, pero siguen siendo N viajes.
