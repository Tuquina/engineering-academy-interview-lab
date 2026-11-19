---
id: iq.transaction-race
format: deep-dive
question: "¿Qué ocurre con una carrera entre dos transacciones que leen un saldo y lo descuentan a la vez?"
expectedPoints:
  - id: lost-update
    point: "Con el nivel por defecto (Read Committed) ambas leen el mismo saldo y una escritura pisa a la otra (lost update) o se viola un invariante."
  - id: atomic-update
    point: "Solución simple: un UPDATE atómico con condición (SET balance = balance - x WHERE id = $1 AND balance >= x)."
  - id: locking
    point: "Bloqueo pesimista con SELECT ... FOR UPDATE para serializar el acceso a esa fila."
  - id: optimistic
    point: "Concurrencia optimista con una columna version y reintento si cambió."
  - id: constraints
    point: "Restricciones en la base (CHECK, UNIQUE) como última defensa, y aislamiento Serializable con reintentos cuando hace falta."
followUps:
  - "¿Qué es un deadlock y cómo lo evitarías?"
  - "¿Cuándo elegirías bloqueo optimista en lugar de pesimista?"
commonMistakes:
  - "Leer el saldo, calcular en la aplicación y escribir el resultado sin ningún control."
  - "Creer que una transacción por sí sola evita la carrera en Read Committed."
relatedLessons: []
relatedPatterns: ["repository"]
---

Con el aislamiento por defecto de PostgreSQL (**Read Committed**), dos transacciones pueden leer el mismo saldo
(100), calcular cada una su resultado (100 − 80 = 20) y escribirlo: se pierde una actualización (**lost update**) o
la cuenta queda en negativo aunque cada transacción validó por separado. Estar dentro de una transacción no lo
evita.

Opciones, de más simple a más general:

- **Operación atómica en la base:**
  `UPDATE accounts SET balance = balance - 80 WHERE id = $1 AND balance >= 80`, y verificar que actualizó una fila.
- **Bloqueo pesimista:** `SELECT ... FOR UPDATE` dentro de la transacción; la segunda espera a que la primera
  termine. Bueno cuando la contención es alta y la transacción es corta.
- **Concurrencia optimista:** columna `version`; el UPDATE incluye `WHERE version = $v` y, si no actualiza filas,
  se recarga y reintenta. Bueno con poca contención.
- **Serializable:** la base detecta la anomalía y aborta una transacción, que hay que reintentar.

Y como defensa final, **restricciones** en la base (`CHECK (balance >= 0)`). Con varios locks, adquirirlos siempre
en el mismo orden evita deadlocks.
