---
id: iq.solid-in-practice
format: quick
question: "Explicá SOLID con ejemplos concretos, no sólo las definiciones."
expectedPoints:
  - id: srp
    point: "SRP: separa responsabilidades que cambian por motivos distintos (por ejemplo, reglas de negocio y acceso a datos)."
  - id: ocp
    point: "OCP: agrega comportamiento nuevo con nuevas implementaciones (Strategy) en lugar de crecer un switch."
  - id: lsp
    point: "LSP: una implementación no debe romper el contrato de la abstracción (no lanzar 'no soportado')."
  - id: isp
    point: "ISP: interfaces chicas centradas en lo que usa cada cliente."
  - id: dip
    point: "DIP: el dominio define interfaces (puertos) y la infraestructura las implementa."
followUps:
  - "¿Cuándo aplicar SOLID es sobreingeniería?"
  - "¿Qué principio se relaciona más con la arquitectura hexagonal?"
commonMistakes:
  - "Recitar definiciones sin ejemplos."
  - "Crear una interfaz para cada clase aunque haya una sola implementación y ningún test que la necesite."
relatedLessons: ["software-architecture.principles"]
relatedPatterns: ["strategy", "hexagonal-architecture", "adapter"]
---

- **S — Responsabilidad única**: un `InvoiceService` que calcula impuestos, arma el PDF y lo envía por email cambia por
  tres motivos distintos. Lo separo en cálculo (dominio), generación de documento y notificación.
- **O — Abierto/cerrado**: si cada medio de pago nuevo agrega un `case` al `switch` de `charge()`, defino una interfaz
  `PaymentMethod` y agrego implementaciones (**Strategy**) sin tocar el código existente.
- **L — Sustitución de Liskov**: si `ReadOnlyRepository` hereda de `Repository` y su `save()` lanza "no soportado",
  cualquier código que espere un `Repository` se rompe. Mejor separar las interfaces.
- **I — Segregación de interfaces**: en lugar de una interfaz `UserService` con 20 métodos, interfaces por caso de uso
  (`FindUser`, `RegisterUser`); un cliente no depende de lo que no usa.
- **D — Inversión de dependencias**: el caso de uso depende de una interfaz `OrderRepository` definida en el dominio;
  Drizzle o Prisma la implementan en infraestructura. Es la base de la **arquitectura hexagonal** y permite probar con
  un repositorio en memoria.

Son guías, no reglas: una interfaz con una sola implementación y sin necesidad de test aislado es indirección de más.
Las aplico donde hay variación real o un límite que conviene proteger.
