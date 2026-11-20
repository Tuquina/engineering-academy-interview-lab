---
id: iq.binary-search
format: quick
question: "¿Cuándo aplica una búsqueda binaria más allá de buscar en un array ordenado?"
expectedPoints:
  - id: invariant
    point: "Requiere una propiedad monótona: todo lo que está a un lado cumple y todo lo del otro no."
  - id: answer-space
    point: "Se puede buscar sobre el espacio de respuestas (capacidad mínima, tiempo mínimo, raíz entera) chequeando si un candidato alcanza."
  - id: bounds
    point: "Define con cuidado los bordes y la condición de corte para evitar bucles infinitos u off-by-one."
  - id: cost
    point: "Cuesta O(log n) iteraciones multiplicado por el costo de evaluar cada candidato."
followUps:
  - "Buscá un elemento en un array ordenado y rotado en O(log n)."
  - "¿Cómo encontrarías la primera aparición de un valor repetido?"
commonMistakes:
  - "Calcular mid sin redondear de forma consistente y quedar en un bucle infinito."
  - "No verificar que la propiedad sea realmente monótona."
relatedLessons: []
relatedPatterns: []
---

La búsqueda binaria funciona siempre que haya una **propiedad monótona**: si un valor cumple, todos los que están de un
lado también cumplen. El array ordenado es sólo el caso más conocido.

Un uso muy común en entrevistas es **buscar sobre el espacio de respuestas**. Ejemplo: "capacidad mínima de un barco
para enviar todos los paquetes en D días". Si una capacidad alcanza, cualquier capacidad mayor también; entonces busco
entre el paquete más pesado y la suma total, y para cada candidato simulo en O(n) si alcanza. Total: O(n log S).

Para no equivocarme con los bordes uso una plantilla fija: buscar el **primer índice que cumple**.

```ts
let lo = 0,
  hi = n; // hi es un valor que seguro cumple
while (lo < hi) {
  const mid = lo + ((hi - lo) >> 1);
  if (ok(mid)) hi = mid;
  else lo = mid + 1;
}
return lo;
```

Con esa misma plantilla resuelvo "primera aparición", "inserción ordenada" o la raíz cuadrada entera. En un array
**rotado**, en cada paso una de las dos mitades está ordenada; decido si el objetivo cae en ella y descarto la otra.
