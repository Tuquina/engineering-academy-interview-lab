---
id: iq.static-vs-dynamic
format: quick
question: "¿Qué diferencia hay entre renderizado estático y dinámico en Next.js y qué hace que una ruta sea dinámica?"
expectedPoints:
  - id: static
    point: "Estático: el HTML se genera en build (o se revalida) y se sirve desde caché/CDN, rápido y barato."
  - id: dynamic
    point: "Dinámico: se renderiza en cada request en el servidor, con datos por usuario o en tiempo real."
  - id: triggers
    point: "Usar cookies(), headers(), searchParams o datos sin caché hace que la ruta sea dinámica."
  - id: revalidate
    point: "La revalidación (por tiempo o bajo demanda) permite contenido estático que se actualiza sin rebuild."
followUps:
  - "¿Cómo revalidarías una página cuando cambia un dato en la base?"
  - "¿Qué es el renderizado parcial (estático con partes dinámicas)?"
commonMistakes:
  - "Leer cookies en un layout raíz y volver dinámica toda la aplicación sin querer."
  - "Asumir que una página estática muestra datos actualizados sin revalidación."
relatedLessons: []
---

Una ruta **estática** se renderiza en el build (o la primera vez, y luego se cachea) y se sirve como HTML desde la
caché o la CDN: es la opción más rápida y barata, ideal para contenido que no depende del usuario. Con
**revalidación** (por tiempo o bajo demanda con `revalidatePath`/`revalidateTag`) el contenido se actualiza sin
recompilar.

Una ruta **dinámica** se renderiza **en cada request** en el servidor. Next.js la vuelve dinámica cuando el render
usa APIs que dependen de la request (`cookies()`, `headers()`, `searchParams`) o datos marcados sin caché.

El error típico es leer cookies o headers en un layout compartido y volver dinámico todo lo que está debajo. Lo
conveniente es mantener estático lo que se pueda y aislar lo dinámico (por ejemplo, en un componente dentro de
`Suspense` o en un Client Component que pide los datos del usuario).
