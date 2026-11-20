---
id: iq.zero-downtime-migrations
format: deep-dive
question: "Tenés que renombrar una columna muy usada en una tabla grande sin cortar el servicio. ¿Cómo lo hacés?"
expectedPoints:
  - id: expand-contract
    point: "Aplica expand/contract en varios despliegues en lugar de un rename directo."
  - id: steps
    point: "Agrega la columna nueva, escribe en ambas, completa datos en lotes, migra lecturas y recién al final elimina la vieja."
  - id: locks
    point: "Evita operaciones que bloquean la tabla: índices con CONCURRENTLY, constraints NOT VALID + VALIDATE, lotes chicos."
  - id: compat
    point: "Mantiene compatibilidad entre la versión vieja y la nueva del código durante el despliegue."
  - id: verify
    point: "Verifica y monitorea en cada paso, con posibilidad de volver atrás."
followUps:
  - "¿Por qué un ALTER TABLE … RENAME es peligroso si el despliegue es gradual?"
  - "¿Cómo hacés el backfill de 50 millones de filas sin afectar la base?"
commonMistakes:
  - "Renombrar en una migración junto con el código nuevo, rompiendo las instancias viejas durante el despliegue."
  - "Actualizar todas las filas en una sola transacción enorme."
relatedLessons: ["postgresql.modeling", "postgresql.operations"]
relatedPatterns: []
---

Un `RENAME` directo rompe el código viejo que sigue corriendo durante un despliegue gradual. Uso **expand/contract** en
varios despliegues:

1. **Expandir**: agregar la columna nueva nullable (operación instantánea).
2. **Doble escritura**: desplegar código que escribe en ambas columnas y sigue leyendo la vieja.
3. **Backfill**: copiar los datos históricos **en lotes** (por ejemplo, 5.000 filas por transacción ordenadas por ID),
   con pausas, controlando el lag de las réplicas y la carga.
4. **Cambiar lecturas**: desplegar código que lee la nueva (con verificación de que coinciden).
5. **Restricciones**: si debe ser `NOT NULL`, agregar `CHECK (col IS NOT NULL) NOT VALID` y luego `VALIDATE CONSTRAINT`,
   que no bloquea escrituras; índices con `CREATE INDEX CONCURRENTLY`.
6. **Contraer**: dejar de escribir la vieja y, en un despliegue posterior, eliminarla.

Cada paso es reversible y compatible con la versión anterior del código. Configuro `lock_timeout` en las migraciones
para que, si no consiguen el lock rápido, fallen en lugar de encolar a todas las queries detrás.
