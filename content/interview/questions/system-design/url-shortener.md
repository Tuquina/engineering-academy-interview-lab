---
id: iq.url-shortener
format: deep-dive
question: "Diseñá un acortador de URLs como bit.ly a alto nivel."
expectedPoints:
  - id: requirements
    point: "Aclara requerimientos: crear y redirigir, alias personalizados, expiración, analíticas; lectura muy superior a escritura."
  - id: estimates
    point: "Estima escala (por ejemplo, 100 M URLs nuevas al mes, 100:1 lecturas) y largo del código (base62 de 7 caracteres ≈ 3,5 billones)."
  - id: id-generation
    point: "Elige cómo generar el código: contador/ID distribuido codificado en base62 o hash con manejo de colisiones, y explica el compromiso."
  - id: read-path
    point: "Optimiza el camino de lectura: caché (Redis/CDN) delante de una base clave-valor o relacional indexada; redirección 301 vs 302."
  - id: analytics
    point: "Registra clics de forma asíncrona (cola o stream) para no frenar la redirección."
followUps:
  - "¿301 o 302? ¿Qué cambia para las analíticas?"
  - "¿Cómo evitás que dos instancias generen el mismo código?"
commonMistakes:
  - "Usar un hash truncado sin considerar colisiones."
  - "Escribir las analíticas de forma síncrona en la redirección."
relatedLessons: ["system-design.introduction", "system-design.scalability"]
relatedPatterns: []
---

**Requerimientos**: crear una URL corta y redirigir; opcionales: alias personalizado, expiración, analíticas. No
funcionales: redirección muy rápida (p99 bajo), alta disponibilidad, lecturas ≫ escrituras.

**Estimaciones**: 100 M URLs nuevas por mes ≈ 40 escrituras/s; con 100:1, ≈ 4.000 lecturas/s promedio (picos de
10–20 mil). En 5 años, 6.000 M de URLs × ~500 bytes ≈ 3 TB. Un código **base62 de 7 caracteres** da 62⁷ ≈ 3,5·10¹²
combinaciones: alcanza.

**API**: `POST /urls { longUrl, alias?, expiresAt? } → { code }` y `GET /{code} → 301/302 Location`.

**Generar el código**:

- **ID único + base62**: un generador de IDs (secuencia por rangos asignados a cada instancia, o Snowflake) y codificar
  en base62. Sin colisiones; los códigos son predecibles (si importa, se mezclan con una permutación).
- **Hash** (por ejemplo, MD5 de la URL) truncado a 7 caracteres: hay que detectar colisiones con una restricción `UNIQUE`
  y reintentar con sal.

**Lectura**: el camino crítico es `GET /{code}`. Caché en **Redis** (las URLs populares siguen una ley de potencia) y,
si el negocio lo permite, cache en la **CDN**. La base puede ser clave-valor (DynamoDB, Cassandra) o PostgreSQL con
índice por código, particionada por código si crece.

**301 vs 302**: un 301 lo cachea el navegador (menos carga, pero se pierden clics para analíticas); un 302 pasa siempre
por el servicio.

**Analíticas**: la redirección publica un evento de clic en una **cola o stream** y responde; un consumidor agrega
los datos. Así un problema en analíticas nunca frena las redirecciones.
