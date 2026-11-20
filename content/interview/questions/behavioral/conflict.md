---
id: iq.behavioral-conflict
format: deep-dive
question: "Contame sobre un desacuerdo técnico con un compañero o con tu líder. ¿Cómo lo resolviste?"
expectedPoints:
  - id: star
    point: "Usa la estructura STAR con una situación real y concreta."
  - id: listen
    point: "Muestra que entendió la postura del otro y sus motivos antes de defender la propia."
  - id: data
    point: "Resuelve con datos, un prototipo, una prueba o criterios acordados, no con autoridad o insistencia."
  - id: outcome
    point: "Cuenta el resultado y la relación posterior, aunque no haya ganado su postura."
  - id: learning
    point: "Cierra con un aprendizaje sobre cómo colaborar o decidir mejor."
followUps:
  - "¿Qué habrías hecho si no se llegaba a un acuerdo?"
  - "¿Alguna vez cambiaste de opinión en una discusión técnica?"
commonMistakes:
  - "Elegir un conflicto personal o hablar mal del compañero."
  - "Contar una historia en la que vos tenías razón y el otro simplemente cedió."
relatedLessons: []
relatedPatterns: []
---

Ejemplo con **STAR**:

- **Situación**: íbamos a lanzar un módulo de notificaciones y un compañero senior proponía separarlo en un
  microservicio nuevo.
- **Tarea**: yo era responsable del diseño del módulo y tenía la preocupación de que el equipo no tenía todavía
  infraestructura para operar otro servicio.
- **Acción**: primero le pedí que me explicara qué problema quería resolver; su motivación real era poder escalar el
  envío por separado. Propuse comparar ambas opciones con criterios explícitos (tiempo de entrega, costo operativo,
  escalabilidad) y armé un prototipo como módulo dentro del monolito con una cola, que permitía escalar los workers de
  forma independiente. Lo revisamos juntos con el líder técnico.
- **Resultado**: elegimos el módulo con cola, lo entregamos en tres semanas y dejamos documentado en un ADR el punto en
  el que convendría extraerlo. Seis meses después lo extrajimos sin reescribir la lógica.

**Aprendizaje**: separar la propuesta del objetivo de fondo y acordar criterios antes de discutir soluciones. Lo que el
entrevistador evalúa es madurez, escucha y foco en el resultado del equipo.
