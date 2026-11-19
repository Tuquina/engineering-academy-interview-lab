---
id: iq.event-loop
format: deep-dive
question: "¿Cómo funciona el event loop de Node.js?"
expectedPoints:
  - id: single-thread
    point: "El código JavaScript corre en un solo hilo; la E/S se delega al sistema operativo o al thread pool de libuv."
  - id: phases
    point: "El loop recorre fases (timers, poll de E/S, check con setImmediate, close) ejecutando los callbacks listos."
  - id: microtasks
    point: "Las microtasks (promesas, queueMicrotask) se vacían después de cada callback, antes de seguir con la siguiente tarea."
  - id: blocking
    point: "Código síncrono costoso bloquea el loop: ninguna otra request avanza mientras tanto."
  - id: concurrency-not-parallelism
    point: "Logra concurrencia (muchas operaciones de E/S en vuelo), no paralelismo de CPU."
followUps:
  - "¿En qué orden se imprimen un setTimeout 0, una promesa resuelta y un console.log síncrono?"
  - "¿Qué operaciones usan el thread pool de libuv?"
  - "¿Cómo detectarías en producción que el event loop está bloqueado?"
commonMistakes:
  - "Decir que Node.js es multihilo para el código de la aplicación."
  - "Pensar que async/await hace que el código corra en paralelo en otro hilo."
relatedLessons: ["nodejs.event-loop"]
---

Node.js ejecuta el JavaScript de la aplicación en **un solo hilo**. La E/S (red, archivos, DNS) se delega: la de
red usa los mecanismos asíncronos del sistema operativo (epoll, kqueue, IOCP) y otras operaciones (archivos, DNS,
crypto, zlib) usan el **thread pool de libuv**. Cuando una operación termina, su callback se encola.

El **event loop** recorre fases: **timers** (setTimeout/setInterval vencidos), callbacks pendientes, **poll**
(espera y procesa E/S), **check** (setImmediate) y close. Después de cada callback se vacía la cola de
**microtasks**: las continuaciones de promesas y `queueMicrotask`. Por eso un `await` resuelto se ejecuta antes que
un `setTimeout(fn, 0)`.

La consecuencia de diseño: Node.js da mucha **concurrencia** con pocos recursos cuando el trabajo es de E/S, pero
cualquier cálculo síncrono costoso (un JSON enorme, un bucle de CPU, una regex catastrófica) **bloquea** a todas las
requests. Se mide con el lag del event loop (`perf_hooks.monitorEventLoopDelay`) y se resuelve moviendo el trabajo
a `worker_threads`, a otro proceso o partiéndolo en pedazos.
