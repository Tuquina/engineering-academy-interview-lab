---
id: sql.top-products-by-category
title: "Productos más vendidos por categoría (window functions)"
difficulty: intermediate
order: 2
topics: ["window functions", "CTE", "ranking"]
mode: result
orderMatters: false
hints:
  - "Primero calculá las unidades vendidas por producto en pedidos válidos (`paid`, `shipped`, `delivered`) en una CTE."
  - "`RANK() OVER (PARTITION BY category ORDER BY units_sold DESC)` numera dentro de cada categoría."
  - "No podés filtrar por una window function en el mismo `WHERE`: envolvela en otra CTE o subconsulta."
solution: |
  WITH sold AS (
    SELECT p.id, p.category, p.name, SUM(oi.quantity) AS units_sold
    FROM products p
    JOIN order_items oi ON oi.product_id = p.id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
    GROUP BY p.id, p.category, p.name
  ),
  ranked AS (
    SELECT category, name, units_sold,
           RANK() OVER (PARTITION BY category ORDER BY units_sold DESC) AS position
    FROM sold
  )
  SELECT category, name, units_sold, position
  FROM ranked
  WHERE position <= 2;
---

## Enunciado

Para armar la portada de cada categoría, el marketplace quiere los **productos con más unidades vendidas** de cada una
(`electrónica`, `hogar`, `libros`, `deportes`), contando sólo pedidos pagados, despachados o entregados. Devolvé los
que ocupan las posiciones 1 y 2 de su categoría. **Los empates comparten posición**: si dos productos empatan en el
segundo lugar, aparecen los dos.

Columnas: `category`, `name`, `units_sold`, `position` (1 = el más vendido de la categoría).

## Explicación

Las **window functions** calculan un valor por fila mirando un grupo de filas relacionadas, sin colapsarlas como
`GROUP BY`. `PARTITION BY category` reinicia la numeración en cada categoría.

- `RANK()` asigna la misma posición a empates y deja huecos (1, 2, 2, 4); `DENSE_RANK()` no deja huecos (1, 2, 2, 3);
  `ROW_NUMBER()` desempata de forma arbitraria. Elegí según qué querés hacer con los empates: acá el enunciado pide
  que aparezcan, por eso electrónica y hogar devuelven tres filas.
- Las window functions se evalúan **después** del `WHERE`, por eso el filtro `position <= 2` va en una consulta
  externa (PostgreSQL no tiene `QUALIFY`).
- Los productos sin ventas no aparecen porque el `JOIN` con `order_items` los descarta; con un `LEFT JOIN` y
  `COALESCE(SUM(...), 0)` se incluirían con 0 unidades.
