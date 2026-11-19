---
id: iq.outbox
format: quick
question: "¿Qué problema resuelve el patrón Outbox?"
expectedPoints:
  - id: dual-write
    point: "La escritura doble: no se puede guardar en la base y publicar en un broker de forma atómica."
  - id: same-tx
    point: "El evento se inserta en una tabla outbox en la misma transacción que el cambio de negocio."
  - id: relay
    point: "Un proceso aparte (relay o CDC) lee la outbox y publica los eventos pendientes."
  - id: at-least-once
    point: "La entrega resultante es al menos una vez: los consumidores deben ser idempotentes."
followUps:
  - "¿Cómo evitás que dos réplicas del relay publiquen el mismo evento?"
  - "¿Qué es el patrón Inbox?"
commonMistakes:
  - "Publicar dentro de la transacción de base de datos."
  - "Asumir que con outbox no hay duplicados."
relatedLessons: []
relatedPatterns: ["transactional-outbox"]
---

Resuelve la **escritura doble**. Si un servicio guarda un pago y después publica `PaymentRegistered` en un broker,
son dos sistemas: si el proceso cae entre ambos, el evento se pierde; si publica antes y la transacción falla,
anuncia un pago que no existe.

Con Outbox, el evento se **inserta en una tabla de la misma base, dentro de la misma transacción** que el pago:
ambos se confirman o ninguno. Un **relay** (polling con `FOR UPDATE SKIP LOCKED`, o CDC sobre el log de la base)
publica los eventos pendientes y los marca como publicados.

Como el relay puede caer después de publicar y antes de marcar, la entrega es **al menos una vez**: los
consumidores deben ser idempotentes, típicamente con una tabla inbox de IDs procesados.
