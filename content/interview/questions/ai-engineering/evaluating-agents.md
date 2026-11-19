---
id: iq.evaluating-agents
format: deep-dive
question: "¿Cómo evaluarías agentes cuyo comportamiento no es determinista?"
expectedPoints:
  - id: dataset
    point: "Un conjunto de casos representativos (incluidos casos límite y adversarios) con el resultado esperado o criterios."
  - id: graders
    point: "Combinar evaluadores: verificaciones deterministas (tool correcta, formato, reglas) y rúbricas, humanas o con un LLM juez calibrado."
  - id: repetitions
    point: "Ejecutar cada caso varias veces y medir tasas (por ejemplo, éxito en 9 de 10), no un único resultado."
  - id: regression
    point: "Comparar versiones contra una línea base y usar las evals como gate antes de publicar."
  - id: production
    point: "Complementar con señales de producción: trazas, feedback, escalamientos a humanos y revisión de muestras."
followUps:
  - "¿Cómo validarías que un LLM juez evalúa de forma confiable?"
  - "¿Qué harías con un caso que falla 2 de cada 10 veces?"
commonMistakes:
  - "Probar a mano con unas pocas conversaciones y declarar que 'funciona'."
  - "Usar un LLM juez sin compararlo nunca contra evaluaciones humanas."
relatedLessons: []
---

Como el mismo input puede producir salidas distintas, no alcanza con un test que pasa una vez. Armaría:

1. **Dataset de casos** representativos: los flujos comunes (deudor que promete pagar, que discute la deuda, que
   pide un plan), casos límite e intentos adversarios (prompt injection, pedidos fuera de política). Cada caso con
   lo esperado: qué tool debería llamar, qué no debe hacer, criterios de calidad.
2. **Evaluadores combinados:** verificaciones **deterministas** donde se pueda (llamó a `register_promise` con
   argumentos válidos, no ofreció un descuento no permitido, respetó el formato) y **rúbricas** para lo subjetivo
   (tono, claridad), con humanos o un **LLM juez** cuya concordancia con humanos se midió.
3. **Repeticiones:** cada caso varias veces, reportando tasas y su variación.
4. **Regresión y gate:** comparar cada versión candidata contra la línea base; publicar sólo si no empeora los
   casos críticos.
5. **Producción:** trazas de cada conversación, tasa de escalamiento a humanos, feedback y revisión periódica de
   muestras, que alimentan nuevos casos al dataset.
