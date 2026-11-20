---
id: iq.hash-maps
format: quick
question: "¿Cómo funciona un hash map y cuándo lo usarías para optimizar un algoritmo?"
expectedPoints:
  - id: mechanism
    point: "Una función de hash convierte la clave en un índice de un array de buckets; las colisiones se resuelven con encadenamiento o direccionamiento abierto."
  - id: cost
    point: "Inserción, búsqueda y borrado son O(1) en promedio y O(n) en el peor caso (muchas colisiones)."
  - id: resize
    point: "Cuando el factor de carga crece se redimensiona y se rehashea: O(n) puntual, O(1) amortizado."
  - id: use
    point: "Se usa para recordar lo visto, contar frecuencias o agrupar, bajando soluciones de O(n²) a O(n)."
  - id: js
    point: "En JavaScript conviene Map/Set sobre objetos planos: claves de cualquier tipo, orden de inserción y tamaño directo."
followUps:
  - "Resolvé Two Sum en O(n) explicando qué guardás en el mapa."
  - "¿Por qué no podés usar un objeto como clave en un objeto plano de JavaScript?"
commonMistakes:
  - "Afirmar que siempre es O(1) sin mencionar el peor caso."
  - "Usar objetos planos con claves que colisionan con propiedades heredadas (por ejemplo, __proto__)."
relatedLessons: []
relatedPatterns: []
---

Un hash map guarda pares clave-valor en un array de **buckets**. La función de hash transforma la clave en un número
que, módulo el tamaño del array, indica el bucket. Si dos claves caen en el mismo lugar hay una **colisión**, que se
resuelve encadenando los elementos en una lista o buscando el siguiente lugar libre.

Con una buena función de hash y un factor de carga controlado, las operaciones son **O(1) en promedio**. Cuando la tabla
se llena se **redimensiona** y se reinsertan todas las claves: esa operación es O(n), pero ocurre tan poco que el costo
amortizado sigue siendo O(1). El peor caso, con todas las claves en el mismo bucket, es O(n).

Es la herramienta más común para optimizar: en **Two Sum** recorro el array una vez y, para cada número, pregunto si
ya vi su complemento (`target - x`); si no, guardo `x → índice`. Así paso de comparar todos los pares (O(n²)) a una sola
pasada (O(n)) con O(n) de memoria.

En JavaScript prefiero `Map` y `Set`: aceptan cualquier tipo de clave, mantienen el orden de inserción, tienen `size` y
no arrastran propiedades del prototipo como un objeto plano.
