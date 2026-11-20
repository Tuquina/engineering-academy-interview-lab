---
id: sql.ticket-sla-breaches
title: "Tickets fuera de SLA de primera respuesta"
difficulty: advanced
order: 7
topics: ["intervalos", "FILTER", "CASE", "NULL"]
mode: result
orderMatters: false
hints:
  - "La primera respuesta es el primer mensaje con `author = 'agent'`: `MIN(sent_at) FILTER (WHERE author = 'agent')`."
  - "Traducí la prioridad a un intervalo con `CASE`: `interval '4 hours'`, `interval '24 hours'` o `interval '48 hours'`."
  - "Un ticket sin respuesta también incumple si ya pasó su plazo al 2026-11-15 00:00 UTC."
solution: |
  WITH first_response AS (
    SELECT t.id, t.priority, t.created_at,
           MIN(m.sent_at) FILTER (WHERE m.author = 'agent') AS responded_at
    FROM support_tickets t
    LEFT JOIN ticket_messages m ON m.ticket_id = t.id
    GROUP BY t.id, t.priority, t.created_at
  )
  SELECT id AS ticket_id,
         priority,
         created_at,
         responded_at
  FROM first_response
  WHERE COALESCE(responded_at, TIMESTAMPTZ '2026-11-15 00:00+00') - created_at >
        CASE priority
          WHEN 'high' THEN interval '4 hours'
          WHEN 'normal' THEN interval '24 hours'
          ELSE interval '48 hours'
        END;
---

## Enunciado

El equipo de soporte del marketplace se compromete a dar una **primera respuesta** dentro de un plazo que depende de
la prioridad del ticket:

| Prioridad | Plazo    |
| --------- | -------- |
| `high`    | 4 horas  |
| `normal`  | 24 horas |
| `low`     | 48 horas |

La primera respuesta es el primer mensaje del ticket escrito por un agente (`author = 'agent'`). Listá los tickets
que **incumplieron** el plazo al 2026-11-15 00:00 UTC: los que respondieron tarde y los que todavía no tienen
respuesta y ya superaron su plazo.

Columnas: `ticket_id`, `priority`, `created_at` y `responded_at` (`NULL` si no hubo respuesta).

## Explicación

Restar dos `timestamptz` da un `interval`, que se compara directamente con otro `interval`. El `CASE` traduce la
prioridad a su plazo; en producción ese plazo suele vivir en una tabla de políticas de SLA unida por prioridad, para
cambiarlo sin tocar consultas.

- `MIN(...) FILTER (WHERE author = 'agent')` busca la primera respuesta sin que los mensajes del cliente interfieran.
- El `LEFT JOIN` conserva tickets sin mensajes de agente; para ellos `responded_at` es `NULL` y el `COALESCE` mide
  la espera hasta la fecha de referencia. Sin él, el ticket 4 (prioridad alta, sin respuesta desde el 4 de noviembre)
  no aparecería.
- El ticket 2 sí tuvo respuesta, pero a las 6 horas: incumplió aunque ahora esté resuelto.
