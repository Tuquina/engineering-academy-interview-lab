---
id: sql.campaign-contact-rate
title: "Tasa de contacto por campaña"
difficulty: intermediate
order: 4
topics: ["agregaciones", "FILTER", "COUNT DISTINCT"]
mode: result
orderMatters: false
hints:
  - "Contá los objetivos de cada campaña y las conversaciones por separado: si unís las dos tablas directamente, los conteos se multiplican."
  - "Un cliente contactado tiene al menos una conversación con resultado distinto de 'no_answer': `COUNT(DISTINCT customer_id) FILTER (WHERE outcome <> 'no_answer')`."
  - "Para el porcentaje: `ROUND(contactados * 100.0 / objetivos, 1)`."
solution: |
  WITH targets AS (
    SELECT campaign_id, COUNT(*) AS targets
    FROM campaign_targets
    GROUP BY campaign_id
  ),
  activity AS (
    SELECT campaign_id,
           COUNT(DISTINCT customer_id) FILTER (WHERE outcome <> 'no_answer') AS contacted,
           COUNT(*) FILTER (WHERE outcome = 'promise') AS promises
    FROM conversations
    GROUP BY campaign_id
  )
  SELECT c.name AS campaign,
         t.targets,
         COALESCE(a.contacted, 0) AS contacted,
         COALESCE(a.promises, 0) AS promises,
         ROUND(COALESCE(a.contacted, 0) * 100.0 / t.targets, 1) AS contact_rate_pct
  FROM campaigns c
  JOIN targets t ON t.campaign_id = c.id
  LEFT JOIN activity a ON a.campaign_id = c.id;
---

## Enunciado

Para comparar campañas, calculá por cada una:

| Columna            | Descripción                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `campaign`         | Nombre de la campaña                                                              |
| `targets`          | Clientes objetivo de la campaña                                                   |
| `contacted`        | Clientes distintos con al menos una conversación cuyo resultado no es `no_answer` |
| `promises`         | Conversaciones que terminaron en promesa de pago (`outcome = 'promise'`)          |
| `contact_rate_pct` | `contacted` sobre `targets`, en porcentaje con un decimal                         |

## Explicación

El error clásico es unir `campaign_targets` y `conversations` en un solo `JOIN`: cada objetivo se repite por cada
conversación y los conteos se inflan (**fan-out**). Agregar cada tabla por separado en CTEs y unir los resultados ya
agregados lo evita.

- `FILTER (WHERE ...)` permite varios conteos condicionales en una sola pasada (equivale a `COUNT(CASE WHEN ... END)`).
- `* 100.0` fuerza división decimal: con enteros, `5 * 100 / 7` daría 71, no 71.4.
- `LEFT JOIN` con `COALESCE` mantiene campañas sin ninguna conversación con 0 en lugar de excluirlas.
