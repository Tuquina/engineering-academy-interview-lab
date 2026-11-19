---
id: iq.type-erasure
format: deep-dive
question: "¿Qué significa que los tipos de TypeScript se borran en tiempo de ejecución y qué implica para validar datos externos?"
expectedPoints:
  - id: erasure
    point: "El compilador elimina las anotaciones de tipos: en runtime sólo queda JavaScript, sin información de tipos."
  - id: no-runtime-check
    point: "Una anotación o un cast (as) no valida nada: datos de una API, un body o un JSON pueden no cumplir el tipo."
  - id: validate-boundaries
    point: "Hay que validar en los bordes (requests, respuestas de terceros, variables de entorno) con un validador en runtime."
  - id: schema-infer
    point: "Una librería de esquemas (Zod, Valibot) valida y además infiere el tipo, evitando duplicar definiciones."
  - id: contrast
    point: "Contrasta con C# o Java, donde los tipos existen en runtime (reflection, casts verificados)."
followUps:
  - "¿Qué diferencia hay entre `as` y una type guard?"
  - "¿Cómo validarías las variables de entorno al arrancar la aplicación?"
  - "¿Por qué `instanceof` no sirve para verificar una interfaz?"
commonMistakes:
  - "Creer que `response.json() as User` garantiza la forma de los datos."
  - "Duplicar el tipo y el validador a mano, que terminan divergiendo."
relatedLessons: ["typescript.runtime-vs-type-system"]
---

TypeScript es un sistema de tipos **estático**: el compilador verifica el código y luego **borra** las anotaciones.
Lo que corre es JavaScript sin tipos. Por eso un `as User` sobre el resultado de `response.json()` es una promesa
que el compilador cree sin verificar: si la API devuelve otra cosa, el error aparece lejos, en otro lugar del código.

La consecuencia práctica es **validar en los bordes del sistema**: bodies de requests, respuestas de terceros,
mensajes de colas, archivos y variables de entorno. Con una librería de esquemas como Zod se define el esquema una
vez, se valida en runtime con `safeParse` y se infiere el tipo con `z.infer`, así tipo y validación no divergen.
Dentro del sistema, una vez validados, los datos se pueden confiar.

En C# o Java los tipos existen en runtime (un cast inválido lanza una excepción y hay reflection); en TypeScript el
equivalente hay que construirlo explícitamente con validadores o type guards.
