---
id: iq.rate-limiter-design
format: deep-dive
question: "Diseñá un rate limiter distribuido para una API pública."
expectedPoints:
  - id: where
    point: "Decide dónde aplicarlo (API gateway, middleware) y por qué clave (usuario, API key, IP, endpoint)."
  - id: algorithms
    point: "Compara algoritmos: fixed window, sliding window log/counter, token bucket y leaky bucket."
  - id: shared-state
    point: "Usa estado compartido entre instancias (Redis) con operaciones atómicas (INCR, scripts Lua)."
  - id: response
    point: "Responde 429 con Retry-After y headers de límite restante."
  - id: failure
    point: "Define qué pasa si Redis no responde (fail open vs fail closed) y la latencia agregada."
followUps:
  - "¿Qué problema tiene la ventana fija en el borde entre dos ventanas?"
  - "¿Cómo aplicarías límites distintos por plan de cliente?"
commonMistakes:
  - "Usar contadores en memoria de cada instancia detrás de un balanceador."
  - "Leer el contador y después incrementarlo en dos operaciones no atómicas."
relatedLessons: ["redis.patterns", "system-design.messaging-resilience"]
relatedPatterns: []
---

**Dónde y por qué clave**: en el API gateway o en un middleware, antes de la lógica cara. La clave depende del objetivo:
por API key o usuario para cuotas de plan, por IP para abuso anónimo, y a veces por endpoint (login más estricto).

**Algoritmos**:

| Algoritmo              | Idea                                                      | Compromiso                                                     |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Fixed window           | Contador por minuto                                       | Simple; permite el doble del límite en el borde entre ventanas |
| Sliding window log     | Timestamps de cada request (Sorted Set)                   | Exacto; usa memoria por request                                |
| Sliding window counter | Ponderar la ventana actual y la anterior                  | Aproximado y barato                                            |
| Token bucket           | Se recargan tokens a ritmo fijo; cada request consume uno | Permite ráfagas controladas; muy usado                         |

**Estado compartido**: con varias instancias el contador vive en **Redis**. La operación tiene que ser **atómica**: un
`INCR` con `EXPIRE`, o un **script Lua** para token bucket (leer, recargar, consumir y guardar en un solo paso). Leer y
después escribir por separado permite pasar el límite con requests concurrentes.

**Respuesta**: `429 Too Many Requests` con `Retry-After` y headers como `RateLimit-Limit`/`RateLimit-Remaining`.

**Fallas**: si Redis no responde, decido entre **fail open** (dejar pasar: prioriza disponibilidad) o **fail closed**
(rechazar: prioriza proteger). Para la mayoría de las APIs, fail open con un límite local de emergencia. Los límites por
plan se leen de la configuración del cliente y se cachean.
