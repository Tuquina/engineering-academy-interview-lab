---
id: iq.unknown-any-never
format: quick
question: "¿Qué diferencia hay entre any, unknown y never en TypeScript?"
expectedPoints:
  - id: any
    point: "any desactiva el chequeo de tipos: se puede hacer cualquier cosa y el error se propaga en silencio."
  - id: unknown
    point: "unknown acepta cualquier valor pero obliga a estrecharlo (narrowing) antes de usarlo: es el tipo seguro para datos desconocidos."
  - id: never
    point: "never representa valores que no pueden existir: funciones que nunca retornan o ramas imposibles."
  - id: exhaustive
    point: "never sirve para chequeos exhaustivos: si se agrega un caso a una unión y no se maneja, el compilador falla."
followUps:
  - "¿Qué tipo usarías para el parámetro de un `catch`?"
  - "¿Cómo escribirías un helper `assertNever`?"
commonMistakes:
  - "Usar any para 'salir del paso' con datos externos en lugar de unknown más validación."
  - "Confundir never con void."
relatedLessons: ["typescript.runtime-vs-type-system"]
---

- **`any`** apaga el sistema de tipos para ese valor: se puede acceder a cualquier propiedad y asignarlo a cualquier
  tipo. El problema es que contagia: lo que sale de un `any` también deja de chequearse.
- **`unknown`** también acepta cualquier valor, pero no permite usarlo hasta estrecharlo con `typeof`,
  `instanceof`, una type guard o un validador. Es el tipo correcto para datos que todavía no se validaron (por
  ejemplo, el error de un `catch` o el resultado de `JSON.parse`).
- **`never`** es el tipo sin valores: lo devuelve una función que siempre lanza o nunca termina, y es el tipo que
  queda en una rama imposible. Se usa para **exhaustividad**: en el `default` de un `switch` sobre una unión
  discriminada se asigna el valor a `never`; si mañana se agrega un caso sin manejarlo, el código deja de compilar.
