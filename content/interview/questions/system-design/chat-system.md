---
id: iq.chat-system
format: deep-dive
question: "Diseñá un sistema de chat en tiempo real (mensajes 1 a 1 y grupos) con entrega confiable."
expectedPoints:
  - id: realtime
    point: "Usa conexiones persistentes (WebSocket) con servidores de conexión y un registro de en qué servidor está cada usuario."
  - id: routing
    point: "Enruta mensajes entre servidores con pub/sub o una cola, no con llamadas directas acopladas."
  - id: storage
    point: "Persiste mensajes antes de confirmar, particionados por conversación, con IDs ordenables por tiempo."
  - id: delivery
    point: "Garantiza entrega con acks, reintentos, deduplicación por ID de cliente y sincronización al reconectar (desde el último ID visto)."
  - id: offline
    point: "Maneja usuarios desconectados con notificaciones push y estados de entrega/lectura."
followUps:
  - "¿Cómo manejás grupos de 50.000 miembros?"
  - "¿Cómo ordenás mensajes enviados casi al mismo tiempo desde dos dispositivos?"
commonMistakes:
  - "Hacer polling HTTP frecuente para recibir mensajes."
  - "Confirmar el mensaje al emisor antes de persistirlo."
relatedLessons: ["system-design.messaging-resilience", "system-design.consistency"]
relatedPatterns: []
---

**Conexiones**: los clientes mantienen un **WebSocket** con un servidor de conexiones (gateway). Un registro de
presencia (Redis) guarda en qué servidor está conectado cada usuario, con TTL renovado por heartbeat.

**Enviar un mensaje**:

1. El cliente envía `{ clientMessageId, conversationId, body }`.
2. El servicio de chat valida, asigna un **ID ordenable** (Snowflake/ULID) y **persiste** el mensaje.
3. Responde un **ack** al emisor (con el ID asignado) recién después de persistir.
4. Publica el mensaje en un canal (Redis Pub/Sub, Kafka) por servidor o conversación; los gateways donde están los
   destinatarios lo empujan por el WebSocket.

**Almacenamiento**: mensajes particionados por `conversationId` y ordenados por ID (Cassandra/ScyllaDB o PostgreSQL
particionado). La consulta típica es "últimos N mensajes de la conversación" o "mensajes desde el ID X".

**Confiabilidad**: el `clientMessageId` permite **deduplicar** si el cliente reintenta. Al reconectar, el cliente pide
todo lo posterior a su **último ID visto**, así no depende de que el push en vivo haya llegado. Estados enviado →
entregado → leído con acks del receptor.

**Offline**: si el destinatario no tiene conexión, se envía una **notificación push** y el mensaje se sincroniza al
volver.

**Grupos grandes**: en lugar de escribir una copia por miembro (fan-out en escritura), se guarda una vez por
conversación y cada miembro lee del log; el push en vivo se hace sólo a los conectados.
