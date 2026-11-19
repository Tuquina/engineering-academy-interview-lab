---
id: iq.multi-tenancy
format: deep-dive
question: "¿Cómo diseñarías un sistema multi-tenant?"
expectedPoints:
  - id: models
    point: "Comparar modelos de aislamiento: base compartida con tenant_id, esquema por tenant o base por tenant."
  - id: enforcement
    point: "El aislamiento se hace cumplir de forma centralizada (Row Level Security, repositorios que exigen el tenant), no confiando en cada consulta."
  - id: context
    point: "El tenant sale de la autenticación y viaja en el contexto de la request; nunca de un parámetro que controla el cliente."
  - id: noisy-neighbor
    point: "Evitar vecinos ruidosos: rate limits, cuotas y colas o concurrencia por tenant."
  - id: config
    point: "Configuración por tenant versionada, y operaciones como exportación y borrado completo de datos de un tenant."
followUps:
  - "¿Cómo probarías que un tenant no puede ver datos de otro?"
  - "¿Qué cambia si un cliente exige su propia base de datos?"
commonMistakes:
  - "Confiar en que cada consulta recuerde el WHERE tenant_id."
  - "Tomar el tenant de un parámetro de la URL sin validarlo contra la sesión."
relatedLessons: []
relatedPatterns: ["hexagonal-architecture"]
---

Empezaría por el **modelo de aislamiento**, que es un compromiso entre garantías y costo operativo:

- **Base compartida con `tenant_id`**: lo más simple de operar y escalar a muchos tenants; el riesgo es una consulta
  que olvide filtrar.
- **Esquema por tenant**: más aislamiento, pero migraciones y conexiones se multiplican.
- **Base por tenant**: aislamiento físico (requisitos regulatorios), al mayor costo operativo.

Con muchos tenants elegiría base compartida y **haría cumplir el aislamiento de forma central**: Row Level Security
en PostgreSQL (`SET LOCAL app.tenant_id` por transacción) y repositorios que exigen el tenant. El tenant se obtiene
de la **autenticación** y viaja en el contexto, nunca de un parámetro que el cliente controla. Para clientes que lo
exijan, un modelo híbrido con base dedicada.

Además: **vecinos ruidosos** (rate limiting y cuotas por tenant, colas o concurrencia por tenant), **configuración
por tenant** versionada, métricas y logs etiquetados por tenant, y procesos para exportar y borrar todos los datos
de un tenant. Lo validaría con tests que intentan acceder a datos de otro tenant.
