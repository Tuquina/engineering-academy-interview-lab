---
id: iq.ts-generics
format: quick
question: "¿Para qué sirven los generics en TypeScript y cómo se restringen?"
expectedPoints:
  - id: purpose
    point: "Permiten escribir funciones y tipos reutilizables que conservan la relación entre el tipo de entrada y el de salida."
  - id: constraint
    point: "extends restringe el parámetro de tipo para poder usar sus propiedades (T extends { id: string })."
  - id: keyof
    point: "Con keyof y tipos indexados se pueden tipar accesos dinámicos de forma segura (K extends keyof T, T[K])."
  - id: inference
    point: "TypeScript infiere los argumentos de tipo en la llamada; rara vez hace falta escribirlos."
  - id: erasure
    point: "Sólo existen en tiempo de compilación: no se puede hacer typeof T en runtime."
followUps:
  - "Escribí una función pluck que reciba una lista de objetos y una clave, y devuelva los valores con el tipo correcto."
  - "¿En qué se diferencian de los generics de C# o Java?"
commonMistakes:
  - "Usar any en lugar de un generic y perder el tipo de salida."
  - "Agregar parámetros de tipo que no relacionan nada (aparecen una sola vez en la firma)."
relatedLessons: ["typescript.generics"]
relatedPatterns: []
---

Un generic es un **parámetro de tipo**: deja que una función o un tipo trabajen con cualquier tipo manteniendo la
relación entre entradas y salidas.

```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
const n = first([1, 2, 3]); // number | undefined, inferido
```

Con **`extends`** restrinjo qué tipos acepta para poder usar sus propiedades sin perder el tipo concreto:

```ts
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((i) => i.id === id);
}

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((i) => i[key]);
}
```

Una regla útil: si un parámetro de tipo aparece **una sola vez** en la firma, probablemente no hace falta.

A diferencia de C# (donde los generics existen en runtime), en TypeScript se **borran** al compilar: no puedo
preguntar en runtime qué es `T`. Si necesito el tipo en ejecución, paso un valor (un esquema, un constructor o un
discriminante).
