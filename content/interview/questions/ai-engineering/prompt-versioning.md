---
id: iq.prompt-versioning
format: deep-dive
question: "¿Cómo versionarías prompts en un producto con agentes en producción?"
expectedPoints:
  - id: immutable
    point: "Versiones inmutables que incluyen todo lo que afecta el comportamiento: prompt, modelo, parámetros, tools y políticas."
  - id: pointer
    point: "Un puntero a la versión activa permite publicar y hacer rollback sin redeploy."
  - id: pinning
    point: "Cada conversación o ejecución registra la versión usada, para reproducir y auditar."
  - id: evals-gate
    point: "Publicar exige pasar una suite de evaluaciones de la versión candidata contra la actual."
  - id: rollout
    point: "Rollout gradual (porcentaje o por tenant) comparando métricas antes de llegar al 100%."
followUps:
  - "¿Guardarías los prompts en el repositorio o en la base de datos?"
  - "¿Qué métricas mirarías durante un rollout gradual?"
commonMistakes:
  - "Versionar sólo el texto del prompt y no el modelo, la temperatura o las tools."
  - "Editar en caliente la versión que está en producción."
relatedLessons: []
relatedPatterns: ["state"]
---

Trataría la configuración del agente como un **artefacto versionado e inmutable**. Una versión incluye todo lo que
cambia el comportamiento: el prompt (y sus plantillas), el **modelo y sus parámetros**, las **tools** habilitadas
con sus esquemas, y las políticas. Cambiar el modelo sin cambiar el texto también es una versión nueva.

- Los **borradores** se editan; al publicar, la versión queda congelada.
- Un **puntero** (por agente y tenant) indica la versión activa: el **rollback** es mover el puntero, inmediato.
- Cada **conversación registra la versión** con la que se ejecutó, para reproducir decisiones y auditar.
- Antes de publicar, la versión candidata corre una **suite de evaluaciones** (casos de regresión, cumplimiento de
  políticas, tool calling) y se compara contra la actual con umbrales.
- El despliegue es **gradual**: un porcentaje de conversaciones nuevas o algunos tenants, mirando tasa de éxito,
  escalamientos a humanos, costo y latencia.

Dónde vive depende de quién edita: si los ingenieros, el repositorio con revisión de código; si los clientes desde
un panel, la base de datos con el mismo modelo de versiones y auditoría.
