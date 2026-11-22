---
id: iq.idempotent-api
format: quick
question: "¿Qué significa que una API sea idempotente y cómo harías idempotente un POST que registra un pago?"
expectedPoints:
  - id: definition
    point: "Repetir la misma operación una o varias veces produce el mismo efecto que hacerla una vez."
  - id: http-methods
    point: "GET, PUT y DELETE son idempotentes por definición; POST no lo es."
  - id: idempotency-key
    point: "Para un POST se usa una clave de idempotencia (header o ID externo) que el cliente reenvía en los reintentos."
  - id: storage
    point: "El servidor guarda la clave con el resultado (restricción única) y ante una repetición devuelve el resultado original."
  - id: why
    point: "Es necesario porque los reintentos ante timeouts son inevitables: el cliente no sabe si la primera llamada se aplicó."
followUps:
  - "¿Qué hacés si llega una repetición mientras la primera request todavía se está procesando?"
  - "¿Cuánto tiempo guardarías las claves de idempotencia?"
commonMistakes:
  - "Chequear si existe y después insertar sin una restricción única: dos requests concurrentes pasan el chequeo."
  - "Confundir idempotencia con seguridad (que no modifica nada)."
relatedLessons: []
relatedPatterns: ["transactional-outbox"]
---

Una operación es **idempotente** si ejecutarla varias veces deja el sistema igual que ejecutarla una sola vez.
`PUT /products/42` con el mismo cuerpo, o `DELETE`, lo son por definición; un `POST /payments` no: dos llamadas
registrarían dos pagos.

Importa porque **los reintentos son inevitables**: si la respuesta se pierde por un timeout, el cliente no sabe si
el pago se registró y lo reintenta.

Para hacer idempotente el POST:

1. El cliente envía una **clave de idempotencia** (un header `Idempotency-Key` o el ID del pago en el sistema del
   proveedor) y la reutiliza en cada reintento.
2. El servidor guarda la clave en la misma transacción que el efecto, con una **restricción única**
   (`UNIQUE (tenant_id, idempotency_key)`), junto con el resultado.
3. Si la clave ya existe, devuelve el resultado guardado sin volver a aplicar el efecto. Si la primera request sigue
   en curso, responde `409` o espera.

La restricción única es la que protege ante requests concurrentes; un "SELECT y después INSERT" no alcanza.
