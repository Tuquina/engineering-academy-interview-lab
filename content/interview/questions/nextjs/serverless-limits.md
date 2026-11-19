---
id: iq.serverless-limits
format: deep-dive
question: "¿Qué limitaciones tienen las funciones serverless como Vercel Functions y cómo diseñás alrededor de ellas?"
expectedPoints:
  - id: duration
    point: "Duración máxima por invocación: los trabajos largos deben salir de la request (colas, jobs, workflows durables)."
  - id: stateless
    point: "Son efímeras y sin estado entre invocaciones: nada de estado en memoria compartido, caches locales o procesos de fondo persistentes."
  - id: connections
    point: "Muchas instancias concurrentes pueden agotar las conexiones a la base: usar pooling (un pooler o drivers HTTP)."
  - id: cold-starts
    point: "Arranques en frío y límites de memoria y tamaño del bundle afectan la latencia y lo que se puede ejecutar."
  - id: external-services
    point: "Lo que necesita persistencia o procesos largos va a servicios externos: base gestionada, colas, Redis, cron."
followUps:
  - "¿Dónde ejecutarías un worker que consume una cola continuamente?"
  - "¿Cómo manejarías un webhook que necesita varios minutos de procesamiento?"
commonMistakes:
  - "Guardar estado en variables globales esperando que persista entre requests."
  - "Abrir una conexión nueva a PostgreSQL por invocación sin pooling."
relatedLessons: []
---

Las funciones serverless se ejecutan bajo demanda en instancias efímeras. Eso trae restricciones de diseño:

- **Duración limitada:** cada invocación tiene un máximo. El procesamiento largo (imports, generación de reportes,
  conversaciones con varias llamadas a un LLM) se saca de la request: se responde rápido y se procesa en una cola,
  un job programado o un motor de workflows durables.
- **Sin estado entre invocaciones:** la memoria de una instancia no se comparte con otras ni está garantizada entre
  requests. Sesiones, caché compartida, locks y rate limiting van a servicios externos (Redis, la base).
- **Conexiones:** muchas instancias concurrentes pueden abrir muchas conexiones a PostgreSQL; hace falta un pooler
  o drivers pensados para serverless.
- **Arranque en frío y límites** de memoria y tamaño del paquete.

El diseño resultante: Route Handlers delgados, casos de uso sin estado, y servicios gestionados para todo lo que
necesita persistir o correr de forma continua (base, colas, cron, almacenamiento de objetos).
