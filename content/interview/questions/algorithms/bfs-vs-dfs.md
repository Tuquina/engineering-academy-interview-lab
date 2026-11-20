---
id: iq.bfs-vs-dfs
format: quick
question: "¿Cuándo usarías BFS y cuándo DFS para recorrer un grafo?"
expectedPoints:
  - id: bfs
    point: "BFS recorre por niveles con una cola y encuentra el camino más corto en cantidad de aristas en grafos sin pesos."
  - id: dfs
    point: "DFS profundiza por una rama con recursión o pila; sirve para explorar todo, componentes conexas, detectar ciclos y backtracking."
  - id: visited
    point: "Ambos necesitan marcar visitados para no entrar en ciclos y cuestan O(V + E)."
  - id: memory
    point: "BFS puede guardar un nivel entero en memoria; DFS recursivo puede desbordar la pila con grafos profundos."
followUps:
  - "¿Qué usarías para el camino más corto con pesos positivos?"
  - "¿Cómo detectás un ciclo en un grafo dirigido con DFS?"
commonMistakes:
  - "Usar DFS para el camino más corto en un grafo sin pesos."
  - "Marcar como visitado al sacar de la cola en lugar de al encolar, procesando nodos varias veces."
relatedLessons: []
relatedPatterns: []
---

**BFS** (búsqueda en anchura) usa una **cola**: visita primero todos los vecinos del origen, después los vecinos de
esos, y así por niveles. Por eso, en un grafo **sin pesos**, la primera vez que llega a un nodo lo hace por el camino
más corto. Es la opción para "mínima cantidad de pasos", recorrer una grilla desde un punto o procesar por niveles un
árbol.

**DFS** (búsqueda en profundidad) usa recursión o una **pila**: sigue una rama hasta el final y retrocede. Sirve para
explorar todo el grafo, contar componentes conexas (por ejemplo, islas en una grilla), detectar ciclos (en grafos
dirigidos, un nodo "en proceso" que vuelve a aparecer indica un ciclo), orden topológico y backtracking.

Ambos son **O(V + E)** si marco los visitados. En BFS conviene marcar al **encolar**, para no agregar el mismo nodo
varias veces. Sobre memoria: BFS puede tener un nivel completo en la cola; un DFS recursivo sobre un grafo muy profundo
puede desbordar la pila, y en ese caso lo paso a una pila explícita.

Con pesos positivos uso **Dijkstra** con un min-heap; con pesos negativos, Bellman-Ford.
