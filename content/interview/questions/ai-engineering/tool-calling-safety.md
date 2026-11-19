---
id: iq.tool-calling-safety
format: quick
question: "¿Cómo harías seguro el tool calling de un agente que puede modificar datos?"
expectedPoints:
  - id: server-side
    point: "El modelo sólo propone la llamada; el servidor la valida y la ejecuta."
  - id: validate-args
    point: "Validar los argumentos con un esquema y reglas de negocio antes de ejecutar."
  - id: context-authz
    point: "Autorizar con el contexto de la sesión (tenant, usuario, permisos de la versión), nunca con identificadores que vengan del modelo."
  - id: least-privilege
    point: "Mínimo privilegio: sólo las tools necesarias y acotadas; confirmación humana para acciones sensibles."
  - id: idempotency-audit
    point: "Tools idempotentes y auditadas (quién, qué argumentos, resultado)."
followUps:
  - "¿Cómo mitigarías un prompt injection que intenta llamar a una tool no permitida?"
  - "¿Qué acciones requerirían confirmación humana en cobranzas?"
commonMistakes:
  - "Confiar en el prompt ('no hagas X') como único control."
  - "Aceptar un tenantId o un debtId arbitrario desde los argumentos del modelo."
relatedLessons: []
---

El principio es que **el modelo propone y el servidor decide**. Toda salida del modelo es input no confiable.

- **Validación:** los argumentos se validan con un esquema (tipos, rangos) y con reglas de negocio (el monto de la
  promesa no supera el saldo).
- **Autorización por contexto:** la tool se ejecuta con el tenant y el deudor **de la conversación**, obtenidos de
  la sesión, no con IDs que aparezcan en los argumentos: así un prompt injection no puede apuntar a datos de otro.
- **Mínimo privilegio:** cada versión del agente habilita sólo las tools que necesita, y las acciones sensibles
  (condonar deuda, cambiar datos de contacto) requieren confirmación humana.
- **Idempotencia y auditoría:** cada tool call tiene un ID; reintentar no duplica efectos, y queda registrado qué se
  llamó, con qué argumentos y qué devolvió.

Las instrucciones del prompt ayudan, pero no son un control de seguridad.
