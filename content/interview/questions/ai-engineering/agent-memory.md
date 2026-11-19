---
id: iq.agent-memory
format: deep-dive
question: "¿Qué tipos de memoria puede tener un agente conversacional y cómo los implementarías?"
expectedPoints:
  - id: short-term
    point: "Memoria de corto plazo: el historial de la conversación actual dentro de la ventana de contexto, con recorte o resumen."
  - id: long-term-structured
    point: "Memoria de largo plazo estructurada: hechos del dominio en la base (promesas, pagos, preferencias de canal)."
  - id: semantic
    point: "Memoria semántica opcional: búsqueda por similitud sobre conversaciones o documentos (embeddings)."
  - id: source-of-truth
    point: "Los hechos críticos se leen del sistema de registro en cada turno, no de lo que el modelo 'recuerda'."
  - id: governance
    point: "Privacidad y gobierno: qué se guarda, por cuánto tiempo, aislado por tenant y con posibilidad de borrar."
followUps:
  - "¿Qué pasa si el resumen de una conversación anterior es incorrecto?"
  - "¿Cuándo no usarías embeddings para la memoria?"
commonMistakes:
  - "Meter todo el historial en el prompt hasta exceder el contexto."
  - "Usar búsqueda semántica para datos que son consultas exactas (saldo, fecha de promesa)."
relatedLessons: []
---

Distinguiría tres tipos:

- **Corto plazo:** el historial de la conversación en curso, enviado en cada turno. Cuando crece, se recortan los
  mensajes viejos o se resumen, cuidando no perder datos clave.
- **Largo plazo estructurada:** lo que el negocio necesita recordar entre conversaciones, guardado como **datos**
  en la base: promesas vigentes, último pago, canal preferido, motivo de disputa. El agente lo obtiene con tools o
  se inyecta al inicio de cada turno desde el **sistema de registro**, que es la fuente de verdad.
- **Semántica:** búsqueda por similitud (embeddings) sobre conversaciones pasadas o documentos, útil para contexto
  no estructurado. No la usaría para datos exactos como saldos o fechas.

Lo importante es que los **hechos críticos no dependan de lo que el modelo recuerde** o resumió, sino de consultas
al sistema. Y el gobierno de la memoria: aislamiento por tenant, retención definida, borrado a pedido y cuidado
con datos personales en prompts y logs.
