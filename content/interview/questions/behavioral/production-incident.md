---
id: iq.production-incident
format: deep-dive
question: "Contame un incidente en producción en el que participaste. ¿Qué hiciste?"
expectedPoints:
  - id: mitigate
    point: "Prioriza mitigar el impacto (rollback, feature flag, escalar) antes de encontrar la causa raíz."
  - id: communicate
    point: "Describe la comunicación durante el incidente: canal, roles, actualizaciones a interesados."
  - id: diagnose
    point: "Explica cómo diagnosticó con datos: métricas, logs, trazas, cambios recientes."
  - id: postmortem
    point: "Menciona un postmortem sin culpables con acciones concretas y responsables."
  - id: role
    point: "Deja claro su rol específico dentro del incidente."
followUps:
  - "¿Qué métrica o alerta te habría permitido detectarlo antes?"
  - "¿Cómo decidiste entre hacer rollback o un fix hacia adelante?"
commonMistakes:
  - "Contar que se pasó horas buscando la causa mientras los usuarios seguían afectados."
  - "No mencionar ninguna acción preventiva posterior."
relatedLessons: ["nodejs.observability-testing"]
relatedPatterns: ["circuit-breaker"]
---

Lo que se evalúa es **criterio bajo presión**. El orden correcto es: detectar → mitigar → comunicar → diagnosticar →
prevenir.

Ejemplo:

- Una noche subió la latencia del checkout a 8 s y la tasa de errores al 15 %. Yo estaba de guardia.
- **Mitigar**: vi que coincidía con un despliegue de 30 minutos antes; hice rollback y la latencia volvió a la normalidad
  en minutos. Recién después busqué la causa.
- **Comunicar**: abrí el canal de incidente, avisé a soporte con el impacto estimado y fui actualizando cada 15 minutos.
- **Diagnosticar**: en las trazas vi que una consulta nueva hacía un Seq Scan sobre una tabla grande; en staging no se
  notaba porque los datos eran pocos.
- **Prevenir**: en el postmortem acordamos datos de volumen realista en staging, alertas por p95 de latencia por
  endpoint y revisar planes de consultas nuevas en el code review.

Rollback primero cuando el cambio reciente es el sospechoso y volver atrás es seguro; fix hacia adelante cuando el
rollback no es posible (por ejemplo, una migración ya aplicada) o el arreglo es trivial y verificable.
