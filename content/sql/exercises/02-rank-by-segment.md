---
id: sql.rank-by-segment
title: "Top 2 deudores por segmento (window functions)"
difficulty: intermediate
order: 2
topics: ["window functions", "CTE", "ranking"]
mode: result
orderMatters: false
hints:
  - "Primero calculá la deuda vencida por cliente (podés reutilizar el ejercicio anterior en una CTE)."
  - "`RANK() OVER (PARTITION BY segment ORDER BY overdue_cents DESC)` numera dentro de cada segmento."
  - "No podés filtrar por una window function en el mismo `WHERE`: envolvela en otra CTE o subconsulta."
solution: |
  WITH overdue AS (
    SELECT c.id, c.full_name, c.segment,
           SUM(i.amount_cents - i.paid_cents) AS overdue_cents
    FROM customers c
    JOIN loans l ON l.customer_id = c.id
    JOIN installments i ON i.loan_id = l.id
    WHERE l.status = 'active'
      AND i.due_date < DATE '2026-11-15'
      AND i.amount_cents > i.paid_cents
    GROUP BY c.id, c.full_name, c.segment
  ),
  ranked AS (
    SELECT segment, full_name, overdue_cents,
           RANK() OVER (PARTITION BY segment ORDER BY overdue_cents DESC) AS position
    FROM overdue
  )
  SELECT segment, full_name, overdue_cents, position
  FROM ranked
  WHERE position <= 2;
---

## Enunciado

Para asignar los casos más críticos a operadores humanos, se necesitan los **dos clientes con más deuda vencida de
cada segmento** (`retail` y `pyme`), con los mismos criterios que el ejercicio anterior (préstamos activos, fecha de
referencia 2026-11-15).

Columnas: `segment`, `full_name`, `overdue_cents`, `position` (1 = mayor deuda del segmento).

## Explicación

Las **window functions** calculan un valor por fila mirando un grupo de filas relacionadas, sin colapsarlas como
`GROUP BY`. `PARTITION BY segment` reinicia la numeración en cada segmento.

- `RANK()` asigna la misma posición a empates y deja huecos (1, 1, 3); `DENSE_RANK()` no deja huecos (1, 1, 2);
  `ROW_NUMBER()` desempata de forma arbitraria. Elegí según qué querés hacer con los empates.
- Las window functions se evalúan **después** del `WHERE`, por eso el filtro `position <= 2` va en una consulta
  externa (PostgreSQL no tiene `QUALIFY`).
