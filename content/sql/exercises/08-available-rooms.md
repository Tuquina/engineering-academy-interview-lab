---
id: sql.available-rooms
title: "Habitaciones disponibles en un rango de fechas"
difficulty: intermediate
order: 8
topics: ["rangos", "NOT EXISTS", "solapamiento"]
mode: result
orderMatters: true
hints:
  - "Una habitación está libre si **no existe** una reserva confirmada que se superponga con el pedido."
  - "Con rangos semiabiertos `[check_in, check_out)`, dos estadías se superponen si `a.check_in < b.check_out AND b.check_in < a.check_out`."
  - "También podés usar `daterange(check_in, check_out) && daterange('2026-12-20', '2026-12-23')`."
solution: |
  SELECT r.hotel, r.room_number, r.capacity
  FROM rooms r
  WHERE r.capacity >= 2
    AND NOT EXISTS (
      SELECT 1
      FROM room_bookings b
      WHERE b.room_id = r.id
        AND b.status = 'confirmed'
        AND b.check_in < DATE '2026-12-23'
        AND b.check_out > DATE '2026-12-20'
    )
  ORDER BY r.hotel, r.room_number;
---

## Enunciado

Una pareja busca alojamiento con **entrada el 2026-12-20 y salida el 2026-12-23**. Listá las habitaciones con
capacidad para **al menos 2 personas** que no tienen ninguna reserva **confirmada** superpuesta con esas fechas.

Las estadías son rangos semiabiertos: quien sale el 20 libera la habitación ese mismo día, y quien entra el 23 no
choca con quien sale el 23.

Columnas: `hotel`, `room_number`, `capacity`. Ordená por hotel y número de habitación.

## Explicación

`NOT EXISTS` expresa exactamente la regla: "no hay ninguna reserva confirmada que choque". A diferencia de
`NOT IN (subconsulta)`, no se rompe si la subconsulta devuelve algún `NULL`.

- La condición de superposición de rangos semiabiertos es `inicio_a < fin_b AND inicio_b < fin_a`. Usar `<=` (o
  `BETWEEN`, que incluye los extremos) marcaría como ocupadas la 102 (entra otro huésped el 23) y la 201 (el huésped
  anterior sale el 20).
- Las reservas canceladas no ocupan: la habitación B de la Posada del Cerro está libre.
- `daterange(check_in, check_out)` construye un rango `[)` y `&&` es el operador de superposición; con un índice GiST
  sobre ese rango la búsqueda escala.

En producción, la garantía de "una habitación no se reserva dos veces para las mismas noches" no se deja a la
aplicación: se declara con una **restricción de exclusión**, por ejemplo
`EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'confirmed')`, que
necesita la extensión `btree_gist` para combinar la igualdad de `room_id` con el operador de rangos.
