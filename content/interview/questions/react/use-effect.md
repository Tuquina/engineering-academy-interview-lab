---
id: iq.use-effect
format: quick
question: "¿Para qué sirve useEffect y cuáles son los errores más comunes al usarlo?"
expectedPoints:
  - id: purpose
    point: "Sincroniza el componente con sistemas externos (suscripciones, timers, APIs del navegador, red) después del render."
  - id: deps
    point: "El array de dependencias debe incluir todo lo que el efecto usa; omitirlas produce valores obsoletos (stale closures)."
  - id: cleanup
    point: "Debe limpiar lo que crea (desuscribir, cancelar timers o requests) en la función de cleanup."
  - id: not-needed
    point: "No hace falta para derivar datos del estado o las props: eso se calcula durante el render."
  - id: race
    point: "En fetch dentro de efectos hay que evitar condiciones de carrera (ignorar respuestas viejas o abortar)."
followUps:
  - "¿Por qué en desarrollo con Strict Mode el efecto se ejecuta dos veces?"
  - "¿Qué alternativas hay a hacer fetch en useEffect en Next.js?"
commonMistakes:
  - "Usar un efecto para copiar props en estado o calcular valores derivados."
  - "Silenciar la regla de dependencias en lugar de reestructurar el efecto."
relatedLessons: []
---

`useEffect` sirve para **sincronizar** el componente con algo externo a React: suscribirse a un evento, iniciar un
timer, conectarse a un WebSocket o pedir datos. Corre después del render y su **cleanup** se ejecuta antes del
siguiente efecto y al desmontar.

Errores frecuentes:

- **Dependencias incompletas:** el efecto captura valores de un render anterior (stale closure). La regla
  `exhaustive-deps` existe por eso; si incluir una dependencia causa un bucle, el problema suele estar en el diseño.
- **Falta de cleanup:** listeners o intervalos que se acumulan.
- **Efectos innecesarios:** derivar datos de props o estado se hace en el render (o con `useMemo` si es costoso), no
  copiándolos a otro estado con un efecto.
- **Carreras en fetch:** si cambia el parámetro, una respuesta vieja puede llegar después de la nueva; se resuelve
  con un flag de cancelación o `AbortController` en el cleanup.

Strict Mode monta, desmonta y vuelve a montar en desarrollo justamente para detectar efectos sin cleanup.
