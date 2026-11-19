---
id: iq.bad-index
format: quick
question: "¿Qué problemas puede producir un índice SQL mal diseñado?"
expectedPoints:
  - id: missing
    point: "Un índice faltante produce escaneos completos (seq scan) en consultas frecuentes, que empeoran al crecer la tabla."
  - id: column-order
    point: "En índices compuestos importa el orden de las columnas: sólo sirve para filtros que usan su prefijo izquierdo."
  - id: write-cost
    point: "Cada índice encarece escrituras y ocupa espacio: índices de más o duplicados penalizan INSERT y UPDATE."
  - id: not-used
    point: "Funciones sobre la columna, casts implícitos o baja selectividad hacen que el planificador no lo use."
  - id: explain
    point: "Se diagnostica con EXPLAIN ANALYZE y estadísticas de uso de índices, no a ojo."
followUps:
  - "¿Qué es un índice parcial y cuándo lo usarías?"
  - "¿Cómo crearías un índice en una tabla grande en producción sin bloquear escrituras?"
commonMistakes:
  - "Indexar cada columna por separado esperando que se combinen eficientemente."
  - "No mirar el plan de ejecución."
relatedLessons: []
---

Un índice mal diseñado puede fallar de dos formas: **no ayudar donde hace falta** o **costar donde no aporta**.

- **Faltante o inadecuado:** la consulta frecuente hace un escaneo completo; funciona con pocos datos y se degrada
  al crecer.
- **Orden de columnas en un índice compuesto:** un índice `(tenant_id, status, due_date)` sirve para filtrar por
  `tenant_id` y `status`, pero no para filtrar sólo por `due_date`.
- **No utilizable:** aplicar una función a la columna (`lower(email)`), comparar tipos distintos o una columna con
  muy pocos valores distintos hacen que el planificador lo ignore. A veces hace falta un índice de expresión o uno
  **parcial** (`WHERE status = 'active'`).
- **Costo de escritura:** cada índice se actualiza en cada INSERT/UPDATE y ocupa espacio; los duplicados o sin uso
  penalizan sin beneficio.

Se diagnostica con `EXPLAIN (ANALYZE, BUFFERS)` y las estadísticas de uso de índices, y en producción se crean con
`CREATE INDEX CONCURRENTLY` para no bloquear escrituras.
