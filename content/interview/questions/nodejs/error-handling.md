---
id: iq.node-error-handling
format: quick
question: "¿Cómo manejás errores en código asíncrono de Node.js y qué pasa con una promesa rechazada sin catch?"
expectedPoints:
  - id: try-await
    point: "Con async/await se usa try/catch alrededor del await; un catch en la función que crea la promesa sin await no atrapa nada."
  - id: unhandled
    point: "Una promesa rechazada sin manejar termina el proceso en Node.js moderno (unhandledRejection lanza por defecto)."
  - id: types
    point: "Distingue errores esperables (validación, no encontrado) de inesperados (bugs, infraestructura) y los trata distinto."
  - id: central
    point: "Centraliza el manejo en el borde (middleware/handler) que loguea con contexto y responde un error genérico."
  - id: crash
    point: "Ante un error desconocido en un estado inconsistente, es preferible reiniciar el proceso (supervisor) que seguir."
followUps:
  - "¿Qué diferencia hay entre return promise y return await promise dentro de un try?"
  - "¿Cómo propagás la causa original al envolver un error?"
commonMistakes:
  - "Olvidar el await y que la excepción escape del try/catch."
  - "Tragar errores con catch vacío."
relatedLessons: ["nodejs.http-apis", "typescript.design-errors-testing"]
relatedPatterns: []
---

Con `async/await`, los errores se manejan con `try/catch` **alrededor del `await`**. Si llamo a una función asíncrona sin
`await` dentro del `try`, su rechazo ocurre después y el `catch` no lo ve. Lo mismo con `return promise` dentro de un
`try`: si quiero atrapar el error ahí, tiene que ser `return await promise`.

Desde Node.js 15, una promesa rechazada **sin manejar termina el proceso** (`--unhandled-rejections=throw` por defecto).
Es lo correcto: un error ignorado deja el sistema en un estado desconocido.

Separo dos tipos de errores:

- **Esperables** (validación, recurso inexistente, saldo insuficiente): parte del dominio; los modelo como resultados o
  errores tipados y se convierten en 4xx.
- **Inesperados** (bug, base caída): se dejan subir hasta un **manejador central** que loguea con contexto y correlation
  ID y responde 500 genérico, sin filtrar detalles internos.

Al envolver un error conservo la causa: `throw new Error("No se pudo cobrar", { cause: error })`. Nunca uso un `catch`
vacío. Si aparece un error que deja el proceso inconsistente (por ejemplo, `uncaughtException`), lo registro y dejo que el
supervisor (Docker, Kubernetes, PM2) reinicie el proceso.
