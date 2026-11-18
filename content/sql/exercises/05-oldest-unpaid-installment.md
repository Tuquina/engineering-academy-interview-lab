---
id: sql.oldest-unpaid-installment
title: "Cuota impaga más antigua por préstamo"
difficulty: intermediate
order: 5
topics: ["DISTINCT ON", "window functions", "top-N por grupo"]
mode: result
orderMatters: false
hints:
  - "Es un problema de 'top-1 por grupo': la primera cuota con saldo de cada préstamo activo."
  - "En PostgreSQL, `DISTINCT ON (loan_id) ... ORDER BY loan_id, number` lo resuelve en una consulta."
  - "Alternativa portable: `ROW_NUMBER() OVER (PARTITION BY loan_id ORDER BY number)` y filtrar la fila 1."
solution: |
  SELECT DISTINCT ON (i.loan_id)
         i.loan_id,
         i.number,
         i.due_date,
         i.amount_cents - i.paid_cents AS balance_cents
  FROM installments i
  JOIN loans l ON l.id = i.loan_id
  WHERE l.status = 'active'
    AND i.amount_cents > i.paid_cents
  ORDER BY i.loan_id, i.number;
---

## Enunciado

El agente siempre negocia empezando por la **cuota impaga más antigua**. Para cada préstamo activo, devolvé esa cuota
(la de menor número con saldo pendiente, esté vencida o no).

Columnas: `loan_id`, `number`, `due_date`, `balance_cents` (`amount_cents - paid_cents`).

## Explicación

"Top-N por grupo" aparece seguido en entrevistas. Tres formas en PostgreSQL:

1. **`DISTINCT ON`** (específico de PostgreSQL): conserva la primera fila de cada `loan_id` según el `ORDER BY`. El
   `ORDER BY` debe empezar por las mismas columnas del `DISTINCT ON`.
2. **`ROW_NUMBER()`** en una CTE y `WHERE rn = 1`: portable a otros motores.
3. **`LATERAL`** con `LIMIT 1`: eficiente cuando hay un índice adecuado y pocos grupos.

Con un índice `(loan_id, number)` —que ya existe por la restricción `UNIQUE`— PostgreSQL puede recorrer las cuotas en
el orden necesario sin ordenar en memoria.
