---
id: iq.monolith-migration
format: deep-dive
question: "Te piden migrar un monolito grande a microservicios. ¿Cómo lo encarás?"
expectedPoints:
  - id: why
    point: "Pregunta qué problema se quiere resolver (despliegues, escala, equipos) y si la migración es la mejor solución."
  - id: modularize
    point: "Propone primero modularizar el monolito con límites claros (bounded contexts) y datos separados por módulo."
  - id: strangler
    point: "Extrae de a un servicio con Strangler Fig, empezando por un módulo de alto valor y bajo acoplamiento."
  - id: data
    point: "Aborda la separación de datos: cada servicio dueño de sus tablas; sincronización por eventos (outbox) en lugar de base compartida."
  - id: platform
    point: "Menciona los costos: observabilidad distribuida, despliegue, consistencia eventual, versionado de contratos."
followUps:
  - "¿Cómo manejás una operación que antes era una transacción y ahora cruza dos servicios?"
  - "¿Qué señales indicarían que conviene frenar la migración?"
commonMistakes:
  - "Proponer reescribir todo de una vez (big bang)."
  - "Separar servicios pero mantener una base de datos compartida entre ellos."
relatedLessons: ["software-architecture.architecture-styles", "software-architecture.distributed-patterns"]
relatedPatterns: ["saga", "transactional-outbox", "hexagonal-architecture"]
---

Primero entiendo **por qué**: ¿los despliegues son lentos y riesgosos? ¿una parte necesita escalar distinto? ¿varios
equipos se pisan? Muchas veces esos problemas se resuelven con un **monolito modular** sin pagar el costo de un sistema
distribuido.

Si la migración se justifica:

1. **Modularizar adentro**: identificar bounded contexts, hacer que los módulos se hablen por interfaces y que cada uno
   sea dueño de sus tablas. Esto ya da la mayor parte del beneficio y hace posible extraer después.
2. **Strangler Fig**: un gateway enruta de a una funcionalidad hacia el servicio nuevo; el resto sigue en el monolito.
   Empiezo por un módulo con **alto valor y bajo acoplamiento** (por ejemplo, notificaciones).
3. **Datos**: cada servicio con su base. Para propagar cambios, eventos con **Transactional Outbox**; nada de leer las
   tablas de otro servicio.
4. **Consistencia**: lo que antes era una transacción pasa a ser una **saga** con compensaciones, y la interfaz debe
   tolerar estados intermedios.
5. **Plataforma antes que servicios**: trazas distribuidas, logs centralizados, CI/CD por servicio, contratos versionados
   y timeouts/reintentos/circuit breakers en cada llamada.

Señales para frenar: cada cambio toca varios servicios a la vez (límites mal elegidos), latencia creciente por cadenas
de llamadas síncronas o un equipo chico gastando más tiempo en operar que en construir.
