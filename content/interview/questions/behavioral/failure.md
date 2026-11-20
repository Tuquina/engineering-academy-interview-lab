---
id: iq.behavioral-failure
format: deep-dive
question: "Contame sobre un error que cometiste en el trabajo y qué hiciste después."
expectedPoints:
  - id: real
    point: "Elige un error real con consecuencias, no una virtud disfrazada."
  - id: ownership
    point: "Asume su parte sin excusas ni culpar a otros."
  - id: mitigation
    point: "Explica cómo lo detectó y qué hizo para mitigar el impacto en el momento."
  - id: prevention
    point: "Describe qué cambió para que no vuelva a pasar (tests, alertas, proceso, checklist)."
  - id: learning
    point: "Cierra con un aprendizaje que aplica hoy."
followUps:
  - "¿Cómo comunicaste el problema a tu equipo y a los afectados?"
  - "¿Qué harías distinto si volviera a pasar?"
commonMistakes:
  - 'Responder "soy demasiado perfeccionista" o un error sin impacto.'
  - "Pasar casi todo el tiempo justificándose."
relatedLessons: []
relatedPatterns: []
---

- **Situación**: desplegué una migración que agregaba un índice a una tabla de varios millones de filas en horario
  laboral.
- **Tarea**: era mi cambio y yo lo había revisado.
- **Acción**: usé `CREATE INDEX` sin `CONCURRENTLY`; la tabla quedó bloqueada para escrituras unos minutos y fallaron
  pagos. Lo detecté por las alertas de errores, avisé en el canal de incidentes, cancelé la operación y la volví a lanzar
  de forma concurrente fuera del pico. Después escribí el postmortem sin culpables.
- **Resultado y prevención**: agregamos una regla en el linter de migraciones que rechaza índices no concurrentes en
  tablas grandes, una sección de "riesgo de bloqueo" en la plantilla de PR y migraciones fuera del horario pico.

**Aprendizaje**: los cambios de esquema son despliegues de riesgo y necesitan su propio checklist. Lo que se evalúa es
cómo reaccionás, si asumís la responsabilidad y si mejorás el sistema para que el error no dependa de la memoria de una
persona.
