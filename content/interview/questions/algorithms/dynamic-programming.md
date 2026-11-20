---
id: iq.dynamic-programming
format: deep-dive
question: "¿Cómo reconocés y resolvés un problema de programación dinámica? Usá un ejemplo."
expectedPoints:
  - id: recognize
    point: "Se reconoce porque pide un óptimo o una cantidad de formas y los subproblemas se repiten (solapamiento) con subestructura óptima."
  - id: state
    point: "Define el estado (qué representa dp[i]), la transición entre estados y los casos base."
  - id: approaches
    point: "Distingue top-down (recursión + memoización) de bottom-up (tabulación) y sus compromisos."
  - id: example
    point: "Resuelve un ejemplo concreto (monedas, escaleras, mochila, subsecuencia común) con su recurrencia."
  - id: complexity
    point: "Calcula la complejidad como cantidad de estados × costo de cada transición y menciona optimizar memoria."
followUps:
  - "¿Por qué un algoritmo greedy no sirve para el problema de las monedas en general?"
  - "¿Cómo reducirías la memoria de O(n·m) a O(m)?"
commonMistakes:
  - "Escribir la recursión sin memoizar y quedar en tiempo exponencial."
  - "No definir con precisión qué significa cada celda de la tabla."
relatedLessons: []
relatedPatterns: []
---

Sospecho de programación dinámica cuando el problema pide **un óptimo** (mínimo costo, máximo valor) o **cuántas
formas** hay, y al plantear la recursión aparecen **los mismos subproblemas** una y otra vez.

El trabajo es definir tres cosas:

1. **Estado**: qué representa `dp[i]`. En "monedas" (mínima cantidad de monedas para sumar `amount`), `dp[a]` es la
   mínima cantidad para sumar exactamente `a`.
2. **Transición**: `dp[a] = min(dp[a - c] + 1)` para cada moneda `c ≤ a`.
3. **Casos base**: `dp[0] = 0`; lo inalcanzable vale infinito.

Puedo implementarlo **top-down** (la recursión natural + un `Map` de memoización: fácil de derivar, pero usa pila) o
**bottom-up** (llenar la tabla en orden: sin riesgo de stack overflow y suele permitir ahorrar memoria).

La complejidad es **estados × costo por transición**: en monedas, `amount × cantidad de monedas`. Un greedy (tomar
siempre la moneda más grande) falla con monedas como `[1, 3, 4]` y monto 6: greedy da 4+1+1 = 3 monedas, el óptimo es
3+3 = 2.

Cuando la transición sólo mira la fila anterior (subsecuencia común más larga, mochila 0/1), puedo guardar sólo una o
dos filas y bajar la memoria de O(n·m) a O(m).
