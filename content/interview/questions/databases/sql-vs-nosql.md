---
id: iq.sql-vs-nosql
format: quick
question: "¿Cómo elegís entre una base relacional y una NoSQL para un sistema nuevo?"
expectedPoints:
  - id: access
    point: "Decide por los patrones de acceso y las garantías que necesita, no por moda."
  - id: relational
    point: "Relacional: transacciones ACID, consultas flexibles y joins, restricciones; buena opción por defecto."
  - id: nosql
    point: "Distingue tipos de NoSQL: clave-valor, documental, columnar ancha y grafos, con sus casos de uso."
  - id: scale
    point: "NoSQL distribuida escala horizontalmente con patrones de acceso conocidos, a cambio de consultas y transacciones limitadas."
  - id: polyglot
    point: "Puede combinarse: fuente de verdad relacional más cachés, búsqueda o almacenamiento analítico."
followUps:
  - "¿Qué ofrece JSONB en PostgreSQL frente a una base documental?"
  - "¿Qué significa diseñar la tabla según la consulta en DynamoDB o Cassandra?"
commonMistakes:
  - 'Elegir NoSQL porque "escala" sin conocer el volumen ni los patrones de acceso.'
  - "Usar una base documental para datos muy relacionales y terminar haciendo joins en la aplicación."
relatedLessons: ["postgresql.introduction", "postgresql.modeling"]
relatedPatterns: []
---

Elijo por **patrones de acceso y garantías**, no por moda.

Una **base relacional** (PostgreSQL) es la mejor opción por defecto: transacciones ACID, restricciones que protegen la
integridad, consultas ad hoc con joins y agregaciones, y con réplicas, particionado e índices escala mucho más de lo
que la mayoría de los productos necesita. Con **JSONB** cubre también datos semiestructurados.

**NoSQL** es una familia:

- **Clave-valor** (Redis, DynamoDB): acceso por clave a enorme escala y baja latencia.
- **Documental** (MongoDB): documentos con estructura variable que se leen completos.
- **Columnar ancha** (Cassandra): escrituras masivas, series de tiempo, particionado por clave.
- **Grafos** (Neo4j): relaciones profundas y recorridos.

Su fortaleza es **escalar horizontalmente** cuando los patrones de acceso son conocidos: en DynamoDB o Cassandra se
diseña la tabla a partir de las consultas. A cambio, consultas flexibles, joins y transacciones entre entidades son
limitados.

En sistemas reales se combinan: **PostgreSQL como fuente de verdad**, Redis para caché y coordinación, un motor de
búsqueda para texto completo y un almacén analítico para reportes.
