---
id: iq.observability
format: quick
question: "¿Qué es la observabilidad y qué instrumentarías en un servicio en producción?"
expectedPoints:
  - id: pillars
    point: "Distingue logs estructurados, métricas y trazas distribuidas, y para qué sirve cada uno."
  - id: correlation
    point: "Propaga un correlation/trace ID para seguir una request entre servicios y logs."
  - id: golden
    point: "Mide las señales doradas o RED: tasa de requests, errores y latencia (percentiles), más saturación."
  - id: alerts
    point: "Alerta por síntomas que afectan al usuario (SLOs), no por cada causa posible."
  - id: privacy
    point: "No registra secretos ni datos personales sensibles."
followUps:
  - "¿Por qué mirar p99 y no el promedio de latencia?"
  - "¿Qué es OpenTelemetry?"
commonMistakes:
  - "Loguear texto libre sin estructura ni contexto."
  - "Alertar por CPU alta aunque los usuarios no estén afectados."
relatedLessons: ["nodejs.observability-testing", "llm-agents.guardrails-observability"]
relatedPatterns: []
---

Observabilidad es poder responder preguntas nuevas sobre el sistema en producción **sin desplegar código nuevo**. Se
apoya en tres señales:

- **Logs estructurados** (JSON) con nivel, mensaje, contexto y `traceId`: el detalle de un evento puntual.
- **Métricas**: series numéricas agregadas y baratas de guardar; sirven para dashboards y alertas.
- **Trazas distribuidas**: el recorrido de una request entre servicios con la duración de cada tramo; muestran dónde se
  va el tiempo.

En un servicio instrumento las señales **RED**: tasa de requests, tasa de errores y duración por endpoint, siempre en
**percentiles** (p50, p95, p99), porque el promedio esconde a los usuarios que esperan 5 segundos. Para recursos
(base, colas): utilización, saturación y errores (lag de la cola, conexiones del pool).

Las alertas van atadas a **SLOs** que reflejan la experiencia del usuario ("99,9 % de los pagos en menos de 1 s"), con
alertas por consumo del error budget. **OpenTelemetry** es el estándar abierto para generar y exportar las tres señales
sin atarse a un proveedor.

Nunca registro contraseñas, tokens ni datos personales completos.
