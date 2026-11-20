---
id: sql.latest-shipment-event
title: "Último estado de cada envío"
difficulty: intermediate
order: 5
topics: ["DISTINCT ON", "window functions", "top-N por grupo"]
mode: result
orderMatters: false
hints:
  - "Es un problema de 'top-1 por grupo': el evento más reciente de cada envío."
  - "En PostgreSQL, `DISTINCT ON (shipment_id) ... ORDER BY shipment_id, occurred_at DESC` lo resuelve en una consulta."
  - "Alternativa portable: `ROW_NUMBER() OVER (PARTITION BY shipment_id ORDER BY occurred_at DESC)` y filtrar la fila 1."
solution: |
  SELECT DISTINCT ON (e.shipment_id)
         e.shipment_id,
         e.status,
         e.occurred_at
  FROM shipment_events e
  ORDER BY e.shipment_id, e.occurred_at DESC;
---

## Enunciado

La página de seguimiento muestra el **estado actual** de cada envío: el de su evento más reciente en
`shipment_events`. Devolvé una fila por envío.

Columnas: `shipment_id`, `status` y `occurred_at` del último evento.

## Explicación

"Top-N por grupo" aparece seguido en entrevistas. Tres formas en PostgreSQL:

1. **`DISTINCT ON`** (específico de PostgreSQL): conserva la primera fila de cada `shipment_id` según el `ORDER BY`.
   El `ORDER BY` debe empezar por las mismas columnas del `DISTINCT ON`.
2. **`ROW_NUMBER()`** en una CTE y `WHERE rn = 1`: portable a otros motores.
3. **`LATERAL`** con `ORDER BY occurred_at DESC LIMIT 1`: eficiente cuando hay un índice adecuado y se consulta un
   subconjunto de envíos.

Con un índice `(shipment_id, occurred_at DESC)` PostgreSQL puede leer los eventos en el orden necesario sin ordenar en
memoria. En producción, muchas veces el estado actual también se guarda desnormalizado en `shipments` y se actualiza
en la misma transacción que inserta el evento, para no recalcularlo en cada consulta.
