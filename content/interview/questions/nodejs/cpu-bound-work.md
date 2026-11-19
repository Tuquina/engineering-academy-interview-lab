---
id: iq.cpu-bound-work
format: deep-dive
question: "¿Qué pasa si ejecutás una operación intensiva en CPU dentro de un handler de Node.js y cómo lo resolverías?"
expectedPoints:
  - id: blocks-loop
    point: "Bloquea el event loop: mientras corre, ninguna otra request avanza y la latencia sube para todos."
  - id: symptoms
    point: "Síntomas: p99 alto, timeouts en health checks y lag del event loop medible."
  - id: worker-threads
    point: "Mover el cálculo a worker_threads (o un pool de workers) para no bloquear el hilo principal."
  - id: offload
    point: "Para trabajos largos, sacarlo de la request: cola y workers separados, respondiendo 202."
  - id: chunking
    point: "Alternativas: partir el trabajo en fragmentos que ceden el control, o usar streams para procesar de a partes."
followUps:
  - "¿Cuántos worker threads crearías y por qué?"
  - "¿Cómo pasarías un buffer grande a un worker sin copiarlo?"
commonMistakes:
  - "Envolver el cálculo en una promesa creyendo que eso lo hace asíncrono."
  - "Escalar réplicas sin resolver el bloqueo: cada réplica sigue bloqueándose."
relatedLessons: ["nodejs.event-loop"]
relatedPatterns: ["circuit-breaker"]
---

El handler corre en el **único hilo** que ejecuta JavaScript. Si calcula durante 2 segundos (generar un PDF,
procesar un CSV grande en memoria, hashear sin parar), durante esos 2 segundos el event loop no atiende **ninguna**
otra request: sube la latencia de todo el servicio, pueden fallar los health checks y el balanceador marcar la
instancia como caída. Se detecta midiendo el **lag del event loop**.

Envolverlo en `new Promise` no ayuda: el código síncrono sigue corriendo en el mismo hilo.

Soluciones, según el caso:

- **`worker_threads`** con un pool de tamaño acotado (cerca de la cantidad de núcleos) para cálculos de segundos.
  Los datos se pasan por mensajes; los buffers grandes se pueden transferir sin copia.
- **Sacarlo de la request**: si tarda mucho, aceptar el trabajo (`202`), encolarlo y procesarlo en workers
  separados, informando el resultado por consulta de estado o webhook.
- **Procesar por partes**: streams para archivos grandes, o fragmentos que ceden el control con `setImmediate`.
