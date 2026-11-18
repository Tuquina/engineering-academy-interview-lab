---
id: sql.broken-promises
title: "Promesas de pago incumplidas"
difficulty: intermediate
order: 3
topics: ["subconsultas", "agregaciones", "fechas"]
mode: result
orderMatters: false
hints:
  - "Una promesa está vencida si `due_date < DATE '2026-11-15'`."
  - "Sumá los pagos del préstamo de la promesa con fecha entre `promised_at` y `due_date` (inclusive)."
  - "Usá `COALESCE(SUM(...), 0)` en una subconsulta correlacionada, o un `LEFT JOIN` + `GROUP BY` con `HAVING`."
solution: |
  SELECT p.id AS promise_id,
         c.full_name,
         p.due_date,
         p.amount_cents
  FROM payment_promises p
  JOIN customers c ON c.id = p.customer_id
  WHERE p.due_date < DATE '2026-11-15'
    AND COALESCE((
      SELECT SUM(pay.amount_cents)
      FROM payments pay
      WHERE pay.loan_id = p.loan_id
        AND (pay.paid_at AT TIME ZONE 'UTC')::date BETWEEN p.promised_at AND p.due_date
    ), 0) < p.amount_cents;
---

## Enunciado

Un agente sólo debe gestionar como "promesa incumplida" a quien **prometió pagar, la fecha ya pasó y no pagó lo
prometido**. Listá las promesas incumplidas al 2026-11-15.

Una promesa se cumple si la suma de los pagos del **mismo préstamo** realizados entre `promised_at` y `due_date`
(ambos inclusive, usando la fecha UTC de `paid_at`) alcanza `amount_cents`.

Columnas: `promise_id`, `full_name`, `due_date`, `amount_cents`.

## Explicación

La subconsulta correlacionada calcula, para cada promesa, lo pagado dentro de su ventana. `COALESCE(..., 0)` es
clave: si no hubo pagos, `SUM` devuelve `NULL`, y `NULL < amount` no es verdadero, así que **sin el COALESCE las
promesas sin ningún pago desaparecerían del resultado**, que son justamente las más importantes.

- Convertir `paid_at` a fecha en UTC hace el resultado independiente de la zona horaria de la sesión.
- La promesa 4 vence el 2026-11-20: todavía está vigente, no incumplida.
- Alternativa equivalente: `LEFT JOIN payments ... GROUP BY p.id ... HAVING COALESCE(SUM(...), 0) < p.amount_cents`.
