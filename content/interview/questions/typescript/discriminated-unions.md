---
id: iq.discriminated-unions
format: quick
question: "¿Qué es una unión discriminada y cómo te ayuda a modelar estados?"
expectedPoints:
  - id: definition
    point: "Es una unión de tipos que comparten una propiedad literal (el discriminante) que identifica cada variante."
  - id: narrowing
    point: "Al chequear el discriminante, el compilador estrecha el tipo y sólo permite acceder a los campos de esa variante."
  - id: impossible-states
    point: "Evita estados imposibles: cada estado declara exactamente sus datos, en lugar de muchos campos opcionales."
  - id: exhaustiveness
    point: "Combinada con never permite chequeos exhaustivos cuando se agregan variantes."
followUps:
  - "¿Cómo persistirías una unión discriminada en una tabla relacional?"
  - "¿Cómo modelarías el resultado de una operación que puede fallar sin excepciones?"
commonMistakes:
  - "Usar varios booleanos (isLoading, isError, data) que permiten combinaciones inválidas."
  - "Usar strings en lugar de literales y perder el narrowing."
relatedLessons: ["typescript.runtime-vs-type-system"]
relatedPatterns: ["state"]
---

Una unión discriminada combina tipos que comparten una propiedad literal, por ejemplo
`{ status: "loading" } | { status: "error"; error: string } | { status: "success"; data: Debt[] }`.

Al hacer `if (state.status === "success")`, TypeScript **estrecha** el tipo y permite usar `data` sólo en esa rama.
Esto hace **irrepresentables los estados imposibles**: no puede haber `data` y `error` a la vez, como pasa con
varios booleanos y campos opcionales.

Con un `switch` sobre el discriminante y un `default` que asigna a `never`, el compilador avisa cuando se agrega una
variante y no se maneja. Es la forma idiomática en TypeScript de modelar máquinas de estados, resultados de
operaciones (`Result` con `ok: true | false`) y eventos.
