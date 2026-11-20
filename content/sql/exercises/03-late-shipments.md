---
id: sql.late-shipments
title: "Envíos demorados"
difficulty: intermediate
order: 3
topics: ["subconsultas", "NULL", "fechas"]
mode: result
orderMatters: false
hints:
  - "La entrega de un envío es su evento `delivered` en `shipment_events`; si no existe, el envío todavía no se entregó."
  - "Calculá la fecha de entrega con una subconsulta correlacionada (`MIN(occurred_at)`) y convertila a fecha UTC."
  - "Un envío sin entrega devuelve `NULL`: ¿qué fecha usarías para compararlo con `promised_by`?"
solution: |
  WITH delivery AS (
    SELECT s.id, s.order_id, s.carrier, s.promised_by,
           (SELECT MIN(e.occurred_at)
              FROM shipment_events e
             WHERE e.shipment_id = s.id
               AND e.status = 'delivered') AS delivered_at
    FROM shipments s
  )
  SELECT d.id AS shipment_id,
         c.full_name,
         d.carrier,
         d.promised_by,
         (d.delivered_at AT TIME ZONE 'UTC')::date AS delivered_on
  FROM delivery d
  JOIN orders o ON o.id = d.order_id
  JOIN customers c ON c.id = o.customer_id
  WHERE COALESCE((d.delivered_at AT TIME ZONE 'UTC')::date, DATE '2026-11-15') > d.promised_by;
---

## Enunciado

Soporte quiere contactar a los clientes con **envíos demorados** al 2026-11-15. Un envío está demorado si:

- se entregó **después** de su fecha comprometida (`promised_by`), o
- **todavía no se entregó** y su fecha comprometida ya pasó.

La fecha de entrega es la fecha UTC del evento `delivered` del envío en `shipment_events`. Un envío entregado el mismo
día de `promised_by` llegó a tiempo.

Columnas: `shipment_id`, `full_name` (cliente del pedido), `carrier`, `promised_by` y `delivered_on` (fecha de
entrega, o `NULL` si no se entregó).

## Explicación

La subconsulta correlacionada busca, para cada envío, su evento de entrega. Si no hay ninguno, `MIN` sobre cero filas
devuelve `NULL`, y `NULL > promised_by` no es verdadero: **sin el `COALESCE`, los envíos que nunca llegaron
desaparecerían del resultado**, que son justamente los más urgentes. `COALESCE(entrega, fecha de referencia)` los
trata como "todavía no llegó al día de hoy".

- Convertir `occurred_at` a fecha en UTC hace el resultado independiente de la zona horaria de la sesión.
- El envío 12 no se entregó, pero vence el 2026-11-18: todavía está en plazo.
- El envío 9 tuvo una visita fallida: un evento distinto de `delivered` no cuenta como entrega.
- Alternativa equivalente: `LEFT JOIN shipment_events e ON ... AND e.status = 'delivered'` con `GROUP BY` y la misma
  condición en un `HAVING`.
