---
id: iq.isolation-levels
format: deep-dive
question: "Explicá los niveles de aislamiento de transacciones y qué anomalías evita cada uno en PostgreSQL."
expectedPoints:
  - id: anomalies
    point: "Nombra las anomalías: lectura sucia, lectura no repetible, lectura fantasma, lost update y write skew."
  - id: read-committed
    point: "Read Committed (default en PostgreSQL): cada sentencia ve lo confirmado al comenzar; permite no repetibles y lost updates en read-modify-write."
  - id: repeatable
    point: "Repeatable Read: una instantánea por transacción; en PostgreSQL detecta actualizaciones concurrentes de la misma fila con error."
  - id: serializable
    point: "Serializable: garantiza un resultado equivalente a ejecutar en serie (SSI); aborta con error de serialización y hay que reintentar."
  - id: practice
    point: "En la práctica combina Read Committed con updates atómicos, FOR UPDATE o control optimista, y reserva Serializable para invariantes complejas."
followUps:
  - "Dos médicos de guardia se dan de baja a la vez y quedan cero. ¿Qué anomalía es y cómo se evita?"
  - "¿Por qué PostgreSQL no tiene lecturas sucias aunque pidas Read Uncommitted?"
commonMistakes:
  - "Creer que una transacción alcanza para evitar cualquier condición de carrera."
  - "Usar Serializable sin lógica de reintento."
relatedLessons: ["postgresql.transactions"]
relatedPatterns: []
---

Las anomalías clásicas:

- **Lectura sucia**: ver datos no confirmados de otra transacción.
- **Lectura no repetible**: leer la misma fila dos veces y obtener valores distintos.
- **Fantasma**: repetir una consulta y que aparezcan filas nuevas.
- **Lost update**: dos transacciones leen, calculan y escriben; una pisa a la otra.
- **Write skew**: dos transacciones leen el mismo conjunto, cada una modifica una fila distinta y juntas violan una
  regla (dos médicos se dan de baja y la guardia queda vacía).

En **PostgreSQL**:

| Nivel                    | Comportamiento                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read Committed (default) | Cada sentencia ve lo confirmado al empezar. Permite no repetibles, fantasmas, lost update en read-modify-write y write skew.                      |
| Repeatable Read          | Una instantánea para toda la transacción; si otra transacción modificó una fila que yo actualizo, error de serialización. No previene write skew. |
| Serializable             | Serializable Snapshot Isolation: detecta dependencias peligrosas y aborta una transacción. Previene todo, pero hay que **reintentar**.            |

PostgreSQL trata Read Uncommitted como Read Committed: por MVCC nunca muestra datos no confirmados.

En la práctica uso **Read Committed** y resuelvo cada caso: `UPDATE … SET stock = stock - 1 WHERE stock > 0` (atómico),
`SELECT … FOR UPDATE` para bloquear filas, control optimista con versión, o restricciones (`UNIQUE`, `CHECK`, exclusion
constraints). Para el write skew de las guardias: bloquear las filas leídas con `FOR UPDATE` o usar **Serializable** con
reintentos.
