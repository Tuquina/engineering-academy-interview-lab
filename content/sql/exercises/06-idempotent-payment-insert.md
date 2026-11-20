---
id: sql.idempotent-payment-insert
title: "Registrar un pago de forma idempotente"
difficulty: intermediate
order: 6
topics: ["UPSERT", "idempotencia", "constraints"]
mode: state
runTimes: 2
hints:
  - "La tabla payments tiene una restricción `UNIQUE (provider, external_id)`."
  - "Un `INSERT` común falla la segunda vez por violar la restricción."
  - "`INSERT ... ON CONFLICT (provider, external_id) DO NOTHING` ignora el duplicado sin error."
solution: |
  INSERT INTO payments (order_id, provider, external_id, amount_cents, paid_at)
  VALUES (17, 'pasarela', 'pay_ext_999', 2100000, '2026-11-15 10:00+00')
  ON CONFLICT (provider, external_id) DO NOTHING;
checkQuery: |
  SELECT COUNT(*) AS registered, SUM(amount_cents) AS amount_cents
  FROM payments
  WHERE provider = 'pasarela' AND external_id = 'pay_ext_999';
---

## Enunciado

El pedido 17 está pendiente de pago y el webhook del proveedor confirma el cobro, pero puede entregar la misma
notificación más de una vez. Escribí la sentencia que registra este pago de forma **idempotente**:

- `order_id`: 17
- `provider`: `'pasarela'`
- `external_id`: `'pay_ext_999'`
- `amount_cents`: 2100000
- `paid_at`: `'2026-11-15 10:00+00'`

La corrección ejecuta **tu sentencia dos veces seguidas**: ninguna ejecución debe fallar y el pago debe quedar
registrado una sola vez.

## Explicación

La idempotencia se apoya en la base de datos, no en un `SELECT` previo: comprobar "¿existe?" y después insertar deja
una ventana de carrera entre dos requests simultáneas. La restricción `UNIQUE` hace que la base resuelva la carrera de
forma atómica, y `ON CONFLICT DO NOTHING` convierte el duplicado en un no-op.

- `ON CONFLICT ... DO UPDATE SET ...` (UPSERT) sirve cuando el reintento trae datos que deben actualizarse.
- `RETURNING id` devuelve una fila sólo si insertó: así la aplicación sabe si el pago era nuevo y si debe marcar el
  pedido como pagado (en la misma transacción).
