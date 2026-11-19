---
id: iq.reliable-webhook
format: deep-dive
question: "¿Cómo implementarías un webhook confiable, tanto para enviarlo como para recibirlo?"
expectedPoints:
  - id: persist-first
    point: "Al enviar: persistir el evento (outbox) y entregar de forma asíncrona, nunca dentro de la request que lo origina."
  - id: retries
    point: "Reintentos con backoff exponencial y jitter, timeouts cortos y un estado final de fallido con reenvío manual (DLQ)."
  - id: signature
    point: "Firma HMAC sobre timestamp y cuerpo, con tolerancia de tiempo contra replay y rotación de secretos."
  - id: receive-fast
    point: "Al recibir: verificar la firma, persistir y responder 2xx rápido; procesar después de forma asíncrona."
  - id: idempotent
    point: "El receptor deduplica por el ID del evento porque la entrega es al menos una vez."
followUps:
  - "¿Cómo manejarías el orden de los eventos?"
  - "¿Qué hacés con un endpoint de cliente que está caído durante días?"
commonMistakes:
  - "Hacer el fetch al cliente dentro de la transacción o la request original."
  - "Procesar el webhook entrante de forma síncrona y devolver timeout al proveedor."
relatedLessons: []
relatedPatterns: ["transactional-outbox", "circuit-breaker"]
---

**Para enviar:**

- El evento se guarda en la misma transacción que el cambio (outbox) y se crea una entrega por suscripción.
- Workers entregan con **timeout corto** y **reintentos con backoff exponencial y jitter** ante 5xx, 429 o
  timeouts; un 4xx no se reintenta. Agotados los intentos, la entrega queda **fallida** con alerta y reenvío
  manual.
- Cada envío lleva un **ID de evento estable**, un timestamp y una **firma HMAC** con un secreto por cliente, sobre
  timestamp y cuerpo. La rotación usa dos secretos válidos durante una ventana.
- Concurrencia y circuit breaker **por endpoint**, para que un cliente lento no afecte a los demás.

**Para recibir:**

- Verificar la firma con comparación de tiempo constante y rechazar timestamps viejos (replay).
- **Persistir y responder 2xx de inmediato**; procesar en segundo plano. Si se procesa síncrono y tarda, el
  proveedor reintenta y llegan duplicados.
- **Deduplicar** por el ID del evento, con una restricción única en la tabla de eventos recibidos.

El orden no está garantizado: si importa, se usa una secuencia o la fecha del evento por entidad para descartar
eventos viejos.
