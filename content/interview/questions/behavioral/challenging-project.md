---
id: iq.challenging-project
format: deep-dive
question: "¿Cuál fue el proyecto técnico más desafiante en el que trabajaste?"
expectedPoints:
  - id: context
    point: "Explica el problema y por qué era difícil (escala, ambigüedad, restricciones, legado)."
  - id: role
    point: "Deja claro cuál fue su rol y sus decisiones, en primera persona."
  - id: tradeoffs
    point: "Menciona alternativas consideradas y por qué eligió una."
  - id: impact
    point: "Cuantifica el resultado (métricas de negocio o técnicas)."
  - id: retro
    point: "Dice qué haría distinto hoy."
followUps:
  - "¿Cuál fue la decisión más difícil y con qué información la tomaste?"
  - "¿Qué parte del diseño cambiarías hoy?"
commonMistakes:
  - "Hablar en plural todo el tiempo y no dejar claro qué hiciste vos."
  - "Describir tecnologías sin explicar el problema que resolvían."
relatedLessons: []
relatedPatterns: []
---

Es la pregunta donde más se evalúa **profundidad técnica y ownership**. Conviene prepararla con más detalle que
cualquier otra y estar listo para que repregunten durante 15 minutos.

Estructura sugerida:

1. **El problema**: "El cierre de facturación mensual tardaba 9 horas y fallaba a mitad sin poder retomarse".
2. **Por qué era difícil**: volumen, procesos legados, no se podía frenar la operación.
3. **Tu rol**: "Lideré el rediseño técnico con dos desarrolladores más".
4. **Decisiones y alternativas**: "Evaluamos escalar verticalmente la base y paralelizar con un job distribuido. Elegimos
   dividir el proceso en lotes idempotentes por cliente en una cola, porque además resolvía la reanudación".
5. **Resultado**: "Bajó a 40 minutos y un fallo sólo reprocesa los lotes afectados".
6. **Retrospectiva**: "Hoy agregaría antes la observabilidad por lote; la sumamos tarde".

Tené a mano números, el diagrama mental de la solución y un compromiso que hayas aceptado conscientemente.
