---
id: sql.seller-sales-and-reviews
title: "Ventas y reseñas por vendedor"
difficulty: intermediate
order: 4
topics: ["agregaciones", "FILTER", "fan-out"]
mode: result
orderMatters: false
hints:
  - "Agregá las ventas y las reseñas por separado: si unís `order_items` y `reviews` al mismo producto, cada ítem se repite por cada reseña y los conteos se multiplican."
  - "Las reseñas negativas se cuentan con `COUNT(*) FILTER (WHERE rating <= 2)`."
  - "Partí de `sellers` con `LEFT JOIN` a cada agregado para no perder vendedores sin reseñas, y usá `COALESCE` para los conteos."
solution: |
  WITH sales AS (
    SELECT p.seller_id, SUM(oi.quantity) AS units_sold
    FROM products p
    JOIN order_items oi ON oi.product_id = p.id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
    GROUP BY p.seller_id
  ),
  feedback AS (
    SELECT p.seller_id,
           COUNT(*) AS reviews,
           COUNT(*) FILTER (WHERE r.rating <= 2) AS negative_reviews,
           ROUND(AVG(r.rating), 1) AS avg_rating
    FROM products p
    JOIN reviews r ON r.product_id = p.id
    GROUP BY p.seller_id
  )
  SELECT s.name AS seller,
         COALESCE(sa.units_sold, 0) AS units_sold,
         COALESCE(f.reviews, 0) AS reviews,
         COALESCE(f.negative_reviews, 0) AS negative_reviews,
         f.avg_rating
  FROM sellers s
  LEFT JOIN sales sa ON sa.seller_id = s.id
  LEFT JOIN feedback f ON f.seller_id = s.id;
---

## Enunciado

Para el panel de calidad de vendedores, calculá por cada vendedor:

| Columna            | Descripción                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `seller`           | Nombre del vendedor                                                           |
| `units_sold`       | Unidades vendidas en pedidos pagados, despachados o entregados (0 si ninguna) |
| `reviews`          | Cantidad de reseñas de sus productos (0 si ninguna)                           |
| `negative_reviews` | Reseñas con `rating` de 1 o 2                                                 |
| `avg_rating`       | Promedio de `rating` redondeado a un decimal (`NULL` si no tiene reseñas)     |

Incluí a todos los vendedores, aunque no tengan reseñas.

## Explicación

El error clásico es unir `order_items` y `reviews` en un solo `JOIN` contra productos: cada ítem se repite por cada
reseña del mismo producto y los conteos se inflan (**fan-out**). Con este dataset, la versión ingenua le cuenta a TecnoSur
más del doble de reseñas de las 5 que tiene. Agregar cada tabla por separado en CTEs y unir los resultados ya agregados lo evita.

- `FILTER (WHERE ...)` permite varios conteos condicionales en una sola pasada (equivale a `COUNT(CASE WHEN ... END)`).
- `AVG` sobre enteros devuelve `numeric` en PostgreSQL, así que `ROUND(..., 1)` funciona sin conversión.
- `LEFT JOIN` con `COALESCE` mantiene a Verde Hogar, que no tiene reseñas, con 0 en lugar de excluirlo. El promedio
  queda en `NULL` a propósito: "sin reseñas" no es lo mismo que "promedio 0".
