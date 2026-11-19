---
id: iq.partial-outage
format: deep-dive
question: "¿Cómo manejarías una caída parcial de servicios?"
expectedPoints:
  - id: timeouts
    point: "Timeouts en todas las llamadas remotas: sin ellos, una dependencia lenta agota los recursos propios."
  - id: retries-breaker
    point: "Reintentos acotados con backoff y jitter, y circuit breakers para dejar de insistir con una dependencia caída."
  - id: degrade
    point: "Degradación elegante: fallbacks con sentido de negocio (encolar, otro canal, datos en caché, funcionalidad reducida)."
  - id: isolation
    point: "Aislar recursos (bulkheads): pools o colas separadas por dependencia para que una no arrastre a las demás."
  - id: observe
    point: "Detectarla con métricas, trazas y alertas sobre SLOs, y comunicar el estado."
followUps:
  - "¿Qué fallback tendría el envío de mensajes si el proveedor está caído?"
  - "¿Cómo evitás que los reintentos empeoren la caída?"
commonMistakes:
  - "Reintentar sin límite ni jitter, generando una tormenta de reintentos."
  - "Tratar todas las dependencias igual, sin distinguir críticas de opcionales."
relatedLessons: []
relatedPatterns: ["circuit-breaker", "decorator"]
---

Primero distinguiría **qué dependencias son críticas** para cada flujo. Registrar un pago no puede depender de que
el proveedor de mensajería esté arriba; el envío del comprobante sí, pero puede esperar.

Mecanismos:

- **Timeouts** en toda llamada remota, ajustados a lo que el flujo tolera.
- **Reintentos acotados** con backoff exponencial y **jitter**, sólo para operaciones idempotentes, con un
  presupuesto de reintentos para no amplificar la carga.
- **Circuit breaker** por dependencia: cuando la tasa de fallas es alta, fallar rápido en lugar de esperar timeouts.
- **Bulkheads:** pools de conexiones, workers o colas separados por dependencia.
- **Degradación elegante:** encolar para más tarde, usar otro canal, servir datos en caché marcados como
  desactualizados, o deshabilitar una funcionalidad con un mensaje claro.

Y **observabilidad**: métricas por dependencia (errores, latencia, estado del breaker), alertas sobre SLOs y un
runbook. Después del incidente, un postmortem sin culpables para ajustar umbrales y fallbacks.
