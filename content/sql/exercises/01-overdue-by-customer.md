---
id: sql.overdue-by-customer
title: "Deuda vencida por cliente"
difficulty: basic
order: 1
topics: ["joins", "agregaciones", "filtros"]
mode: result
orderMatters: true
hints:
  - "Necesitás unir customers → loans → installments."
  - "El saldo de una cuota es `amount_cents - paid_cents`; vencida significa `due_date < DATE '2026-11-15'`."
  - "Filtrá préstamos con `status = 'active'`, agrupá por cliente y ordená por la suma descendente."
solution: |
  SELECT c.full_name,
         SUM(i.amount_cents - i.paid_cents) AS overdue_cents
  FROM customers c
  JOIN loans l ON l.customer_id = c.id
  JOIN installments i ON i.loan_id = l.id
  WHERE l.status = 'active'
    AND i.due_date < DATE '2026-11-15'
    AND i.amount_cents > i.paid_cents
  GROUP BY c.id, c.full_name
  ORDER BY overdue_cents DESC, c.full_name;
---

## Enunciado

El equipo de estrategia quiere saber **cuánta deuda vencida tiene cada cliente** al **2026-11-15**, considerando sólo
préstamos **activos** (no los pagados ni los castigados).

Devolvé dos columnas:

| Columna         | Descripción                                                         |
| --------------- | ------------------------------------------------------------------- |
| `full_name`     | Nombre del cliente                                                  |
| `overdue_cents` | Suma de los saldos (`amount_cents - paid_cents`) de cuotas vencidas |

Incluí sólo clientes con deuda vencida y ordená de mayor a menor deuda (a igual deuda, por nombre).

## Explicación

La consulta recorre la relación cliente → préstamo → cuota con `JOIN` y filtra en el `WHERE` **antes** de agrupar:
préstamos activos, cuotas vencidas y con saldo. Después `GROUP BY` agrega por cliente.

- Agrupar por `c.id` (y no sólo por el nombre) evita mezclar dos clientes homónimos.
- El préstamo castigado de Diego Fernández queda fuera por el filtro de estado: es deuda, pero se gestiona con otro
  proceso (recupero judicial o venta de cartera).
- El pago parcial de Julián Ortiz aparece como saldo pendiente (75.000 centavos), no como cuota entera.
