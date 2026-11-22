---
id: iq.cqrs-vs-event-sourcing
format: deep-dive
question: "¿Qué diferencia existe entre CQRS y Event Sourcing? ¿Usarías alguno en una billetera virtual?"
expectedPoints:
  - id: cqrs
    point: "CQRS separa el modelo de escritura (comandos que validan reglas) del de lectura (consultas optimizadas)."
  - id: es
    point: "Event Sourcing guarda el estado como la secuencia de eventos que lo produjeron; el estado actual se reconstruye."
  - id: independent
    point: "Son independientes: se pueden combinar, pero ninguno requiere al otro."
  - id: costs
    point: "Costos: consistencia eventual en lecturas, versionado de eventos, proyecciones y mayor complejidad."
  - id: judgment
    point: "Aplicarlos sólo donde hay necesidad real (auditoría fuerte, lecturas muy distintas de las escrituras), no a todo el sistema."
followUps:
  - "¿Cómo cambiarías el esquema de un evento que ya está guardado?"
  - "¿Qué alternativa más simple da auditoría sin Event Sourcing completo?"
commonMistakes:
  - "Usar los términos como sinónimos."
  - "Adoptar Event Sourcing en todo el sistema por la auditoría, cuando un ledger o una tabla de auditoría alcanza."
relatedLessons: []
relatedPatterns: ["cqrs", "transactional-outbox"]
---

**CQRS** separa los comandos (cambian estado y protegen invariantes) de las consultas (leen, a menudo desde un
modelo desnormalizado). Puede ser tan simple como consultas SQL específicas para pantallas, o tan completo como una
base de lectura alimentada por eventos.

**Event Sourcing** cambia cómo se **persiste**: en lugar del estado actual, se guarda la secuencia de eventos
(`AccountOpened`, `TransferReceived`, `PaymentSent`) y el estado se obtiene aplicándolos. Da auditoría completa y
la posibilidad de reconstruir estados pasados, a costa de versionar eventos, construir proyecciones y manejar la
consistencia eventual.

Son **independientes**: Event Sourcing casi siempre viene con CQRS (consultar eventos directamente es incómodo),
pero CQRS no necesita Event Sourcing.

En una billetera, aplicaría CQRS liviano para la lista de movimientos de la app (lecturas pesadas y distintas de
las escrituras). Para la auditoría de saldos, un **ledger** de movimientos inmutables da casi todo el beneficio de
Event Sourcing en esa parte, sin imponerlo a todo el sistema.
