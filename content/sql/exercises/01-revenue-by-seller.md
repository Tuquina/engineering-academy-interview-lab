---
id: sql.revenue-by-seller
title: "Ventas por vendedor"
difficulty: basic
order: 1
topics: ["joins", "agregaciones", "filtros"]
mode: result
orderMatters: true
hints:
  - "Necesitás unir sellers → products → order_items → orders."
  - "El importe de un ítem es `quantity * unit_price_cents`; los pedidos válidos tienen `status IN ('paid', 'shipped', 'delivered')`."
  - "Agrupá por vendedor y ordená por la suma descendente (a igual importe, por nombre)."
solution: |
  SELECT s.name AS seller,
         SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
  FROM sellers s
  JOIN products p ON p.seller_id = s.id
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('paid', 'shipped', 'delivered')
  GROUP BY s.id, s.name
  ORDER BY revenue_cents DESC, s.name;
---

## Enunciado

El equipo comercial del marketplace quiere saber **cuánto vendió cada vendedor**. Cuentan sólo los pedidos pagados,
despachados o entregados: los **pendientes de pago**, los **cancelados** y los
**reembolsados** no suman.

Devolvé dos columnas:

| Columna         | Descripción                                                        |
| --------------- | ------------------------------------------------------------------ |
| `seller`        | Nombre del vendedor                                                |
| `revenue_cents` | Suma de `quantity * unit_price_cents` de sus ítems en esos pedidos |

Ordená de mayor a menor importe (a igual importe, por nombre).

## Explicación

La consulta recorre la relación vendedor → producto → ítem → pedido con `JOIN` y filtra en el `WHERE` **antes** de
agrupar. Después `GROUP BY` agrega por vendedor.

- Se usa `unit_price_cents` del ítem y no `price_cents` del producto: el precio puede cambiar después de la compra, y
  la venta se registra con el precio de ese momento.
- Agrupar por `s.id` (y no sólo por el nombre) evita mezclar dos vendedores con el mismo nombre si el modelo lo
  permitiera.
- Las zapatillas del pedido 6 quedan fuera porque el pedido se reembolsó; las del pedido 4, porque se canceló; la
  pelota del pedido 17, porque todavía no se pagó.
