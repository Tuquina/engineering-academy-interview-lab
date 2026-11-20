---
id: iq.complexity-analysis
format: quick
question: "¿Cómo analizás la complejidad de una solución y por qué importa en una entrevista?"
expectedPoints:
  - id: definition
    point: "Big-O describe cómo crecen el tiempo o la memoria con el tamaño de la entrada, ignorando constantes; se analiza el peor caso salvo que se aclare."
  - id: counting
    point: "Se cuentan las operaciones dominantes: bucles anidados multiplican, pasos secuenciales se suman y se queda el término mayor."
  - id: hidden
    point: "Considera costos ocultos: métodos como includes, slice o spread son O(n); la recursión consume O(profundidad) de pila."
  - id: space
    point: "Analiza también la memoria extra (por ejemplo, un Set auxiliar es O(n))."
  - id: constraints
    point: "Usa los límites de la entrada para decidir: con n = 10⁵ una solución O(n²) no termina a tiempo."
followUps:
  - "¿Qué es la complejidad amortizada? Dá un ejemplo."
  - "¿Por qué una búsqueda en un hash map es O(1) promedio pero O(n) en el peor caso?"
commonMistakes:
  - "Olvidar que un includes dentro de un for convierte la solución en O(n²)."
  - "Dar sólo la complejidad de tiempo e ignorar la memoria."
relatedLessons: []
relatedPatterns: []
---

Big-O expresa **cómo escala** una solución, no cuánto tarda en milisegundos. Para calcularla miro la operación que
domina: un bucle sobre `n` elementos es O(n); un bucle anidado sobre los mismos datos, O(n²); partir el problema a la
mitad en cada paso, O(log n); ordenar, O(n log n).

Presto atención a los **costos ocultos**: `array.includes`, `indexOf`, `slice` o `[...arr]` recorren o copian todo el
array, así que dentro de un bucle cambian la complejidad. En recursión, además del tiempo, cuento la **profundidad de la
pila**.

También analizo la **memoria extra**: usar un `Map` para recordar lo visto baja el tiempo de O(n²) a O(n) a cambio de
O(n) de memoria, y conviene decirlo explícitamente.

En la entrevista los **límites** de la entrada orientan: con n hasta 10⁵ o 10⁶ necesito O(n log n) u O(n); con n ≤ 20
puede valer un backtracking exponencial. La **complejidad amortizada** aparece en estructuras como el `push` de un array
dinámico: casi siempre O(1) y ocasionalmente O(n) al redimensionar, lo que en promedio da O(1).
