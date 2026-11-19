---
id: iq.modular-monolith-vs-microservices
format: deep-dive
question: "¿Cómo decidirías entre un monolito modular y microservicios?"
expectedPoints:
  - id: org
    point: "El factor principal suele ser organizacional: cuántos equipos necesitan desplegar de forma independiente."
  - id: costs-micro
    point: "Microservicios agregan costos de sistema distribuido: red, consistencia eventual, observabilidad, operación."
  - id: modular-first
    point: "Un monolito modular con límites explícitos da la mayoría de los beneficios de diseño con operación simple."
  - id: extraction
    point: "Extraer un módulo a servicio cuando hay una razón concreta: escala, disponibilidad, tecnología o autonomía de un equipo."
  - id: boundaries
    point: "Los límites por dominio importan más que el despliegue: microservicios con malos límites son un monolito distribuido."
followUps:
  - "¿Qué señales te indicarían que es momento de extraer un módulo?"
  - "¿Cómo harías cumplir los límites entre módulos en un monolito?"
commonMistakes:
  - "Elegir microservicios por moda o por 'escalabilidad' sin un problema concreto."
  - "Partir en servicios por capas técnicas en lugar de por dominio."
relatedLessons: []
relatedPatterns: ["hexagonal-architecture"]
---

Empezaría por las preguntas que más pesan: **¿cuántos equipos van a trabajar en el sistema y necesitan desplegar sin
coordinarse?** ¿Hay partes con requisitos de escala, disponibilidad o tecnología muy distintos? ¿Tenemos capacidad
de operar un sistema distribuido (observabilidad, automatización, guardias)?

Con un equipo chico o mediano, elegiría un **monolito modular**: módulos por dominio con API pública, datos propios
por módulo, eventos internos y una regla automática que impida saltarse los límites. Se obtiene buena
mantenibilidad con la operación y la consistencia de un solo despliegue (transacciones locales, un pipeline).

**Extraería un módulo a servicio** cuando haya una razón concreta: necesita escalar de forma muy distinta, tiene un
equipo propio con otro ritmo, o requiere aislamiento por disponibilidad o seguridad. Si los límites ya están bien
definidos, la extracción es mecánica.

Lo que no haría es empezar con microservicios sin límites claros: el resultado es un **monolito distribuido**, con
todos los costos de la red y ninguno de los beneficios.
