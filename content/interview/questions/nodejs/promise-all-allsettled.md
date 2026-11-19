---
id: iq.promise-all-allsettled
format: quick
question: "¿Cuál es la diferencia entre Promise.all y Promise.allSettled?"
expectedPoints:
  - id: all-fail-fast
    point: "Promise.all rechaza en cuanto una promesa rechaza (fail fast), con ese error."
  - id: allsettled
    point: "Promise.allSettled espera a todas y devuelve el resultado de cada una ({ status: fulfilled | rejected })."
  - id: no-cancel
    point: "Ninguna cancela las demás operaciones: con all, las otras siguen corriendo aunque se ignore su resultado."
  - id: when
    point: "all cuando se necesitan todos los resultados para continuar; allSettled cuando los fallos parciales son aceptables y se informan."
followUps:
  - "¿Cuándo usarías Promise.race o Promise.any?"
  - "¿Cómo limitarías la concurrencia si tenés 10.000 promesas?"
commonMistakes:
  - "Creer que Promise.all cancela las otras operaciones al fallar una."
  - "Lanzar miles de requests a la vez con Promise.all sin limitar la concurrencia."
relatedLessons: ["typescript.promises-task-completablefuture"]
---

`Promise.all` recibe varias promesas y se resuelve con un array de resultados cuando **todas** se cumplen; si
**una** rechaza, rechaza de inmediato con ese error (fail fast). Es lo adecuado cuando el paso siguiente necesita
todos los resultados, por ejemplo cargar la deuda y el historial del deudor para armar una respuesta.

`Promise.allSettled` espera a que todas terminen y devuelve, para cada una, `{ status: "fulfilled", value }` o
`{ status: "rejected", reason }`. Sirve cuando los fallos parciales son aceptables: enviar 50 notificaciones y
reportar cuáles fallaron.

Un detalle importante: **ninguna cancela** el trabajo de las otras promesas. Si `Promise.all` rechaza, las demás
operaciones siguen en vuelo; para cancelarlas hace falta un `AbortController`. Y con muchas operaciones conviene
limitar la concurrencia (un pool o una cola) en lugar de lanzar todas a la vez.
