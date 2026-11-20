---
id: iq.testing-strategy
format: deep-dive
question: "¿Qué estrategia de testing usarías para un servicio backend nuevo?"
expectedPoints:
  - id: pyramid
    point: "Describe la pirámide: muchos unitarios del dominio, integración con dependencias reales en los bordes y pocos end-to-end."
  - id: real-deps
    point: "Prueba la integración con una base real (contenedor efímero) en lugar de mockear el ORM."
  - id: fakes
    point: "Usa fakes de los puertos propios y contract tests para servicios externos en lugar de mocks frágiles."
  - id: ci
    point: "Integra los tests en CI con tiempos acotados y sin tests inestables tolerados."
  - id: risk
    point: "Prioriza por riesgo: dinero, permisos, concurrencia y casos límite antes que cobertura porcentual."
followUps:
  - "¿Qué hacés con un test que falla al azar?"
  - "¿La cobertura del 100 % garantiza algo?"
commonMistakes:
  - "Mockear todo y terminar testeando los mocks."
  - "Medir calidad sólo por porcentaje de cobertura."
relatedLessons: ["nodejs.observability-testing", "typescript.design-errors-testing"]
relatedPatterns: ["hexagonal-architecture", "repository"]
---

Diseño los tests según **dónde puede romperse el sistema**:

- **Unitarios** sobre el dominio y los casos de uso: reglas de negocio, cálculos, transiciones de estado. Son rápidos y
  van a ser la mayoría. Con arquitectura hexagonal, los casos de uso se prueban con **fakes** de los puertos (un
  repositorio en memoria), sin base ni HTTP.
- **Integración** en los adaptadores: el repositorio contra **PostgreSQL real** en un contenedor (Testcontainers o
  Docker Compose), los Route Handlers con requests HTTP reales. Ahí aparecen los errores de SQL, restricciones,
  transacciones y serialización que un mock nunca muestra.
- **Contract tests** con servicios externos: verifico que mi adaptador cumple el contrato del proveedor (o uso su
  sandbox) en lugar de asumir su comportamiento.
- **End-to-end** sólo de los flujos críticos (registro, pago), porque son lentos y más frágiles.

Priorizo por **riesgo**: dinero, autorización, concurrencia (dos requests simultáneas), idempotencia y bordes. La
cobertura es una señal para encontrar zonas sin probar, no un objetivo: 100 % de líneas ejecutadas no implica que las
aserciones verifiquen algo.

En CI todo corre en cada PR; un test inestable se arregla o se pone en cuarentena con un responsable, porque un CI en el
que nadie confía no protege.
