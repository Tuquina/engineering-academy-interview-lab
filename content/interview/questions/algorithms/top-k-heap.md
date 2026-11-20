---
id: iq.top-k-heap
format: quick
question: "¿Cómo obtendrías los k elementos más frecuentes de un array grande?"
expectedPoints:
  - id: count
    point: "Primero cuenta frecuencias con un hash map en O(n)."
  - id: heap
    point: "Mantiene un min-heap de tamaño k: si supera k, saca el mínimo; queda O(n log k)."
  - id: alternatives
    point: "Compara con ordenar todo (O(n log n)) y con bucket sort por frecuencia (O(n))."
  - id: stream
    point: "Menciona qué cambia si los datos llegan como stream o no entran en memoria (heap incremental, conteo aproximado)."
followUps:
  - "¿Cómo implementarías un heap si el lenguaje no trae uno?"
  - "¿Cómo calcularías la mediana de un stream de números?"
commonMistakes:
  - "Usar un max-heap con todos los elementos y no aprovechar el tamaño k."
  - "Ordenar el array completo cuando k es mucho menor que n sin mencionar el costo."
relatedLessons: []
relatedPatterns: []
---

Primero cuento cuántas veces aparece cada elemento con un `Map`: una pasada, O(n).

Para quedarme con los k más frecuentes uso un **min-heap de tamaño k** ordenado por frecuencia: recorro el mapa, inserto
cada par y, si el heap supera k elementos, saco el mínimo. Al final quedan los k mayores. Cada operación es O(log k), así
que el total es **O(n log k)**, mucho mejor que ordenar todo cuando k es chico.

Alternativas: ordenar las entradas por frecuencia es O(n log n) y simple de escribir; **bucket sort** por frecuencia
(un array donde el índice es la frecuencia) lo resuelve en O(n) porque la frecuencia máxima es n.

JavaScript no trae un heap, así que en una entrevista lo implemento con un array y las operaciones `siftUp`/`siftDown`, o
aclaro que usaría una librería.

Si los datos llegan como **stream**, el heap de tamaño k se puede mantener incrementalmente; si ni siquiera el conteo
entra en memoria, existen estructuras aproximadas como Count-Min Sketch. La **mediana de un stream** se resuelve con dos
heaps (un max-heap para la mitad baja y un min-heap para la alta).
