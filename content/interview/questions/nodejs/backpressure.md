---
id: iq.backpressure
format: quick
question: "¿Qué es backpressure y cómo se maneja en Node.js?"
expectedPoints:
  - id: definition
    point: "Es la señal de que un consumidor no da abasto con el ritmo del productor."
  - id: memory
    point: "Ignorarla acumula datos en memoria hasta agotarla o degradar el proceso."
  - id: streams
    point: "En streams, write() devuelve false cuando el buffer está lleno y hay que esperar el evento drain; pipe() y pipeline() lo hacen solos."
  - id: systems
    point: "A nivel sistema se aplica con colas acotadas, límites de concurrencia o rechazando con 429/503."
followUps:
  - "¿Por qué pipeline() es preferible a encadenar pipe()?"
  - "¿Cómo aplicarías backpressure entre una API y una cola de trabajos?"
commonMistakes:
  - "Leer un archivo enorme completo en memoria en lugar de usar streams."
  - "Ignorar el valor de retorno de write()."
relatedLessons: ["nodejs.event-loop"]
---

**Backpressure** es la presión que ejerce un consumidor lento sobre un productor rápido: si el productor no baja el
ritmo, los datos se acumulan en algún buffer hasta agotar la memoria.

En los **streams** de Node.js, `writable.write(chunk)` devuelve `false` cuando el buffer interno superó su límite
(`highWaterMark`); el productor debe pausar hasta el evento `drain`. `stream.pipeline()` maneja esto
automáticamente y además propaga errores y cierra todos los streams, por eso es preferible a encadenar `pipe()`.

El mismo concepto aplica a sistemas: una cola **acotada**, un límite de concurrencia por consumidor o rechazar con
`429`/`503` cuando la cola está llena son formas de aplicar backpressure en lugar de aceptar trabajo que no se va a
poder procesar.
