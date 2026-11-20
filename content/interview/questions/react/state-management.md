---
id: iq.react-state-management
format: deep-dive
question: "¿Cómo decidís dónde vive el estado en una aplicación React y cuándo usarías una librería de estado global?"
expectedPoints:
  - id: local
    point: "Empieza por el estado local y lo levanta al ancestro común sólo cuando varios componentes lo necesitan."
  - id: derived
    point: "No guarda en estado lo que se puede derivar de props u otro estado."
  - id: server
    point: "Separa el estado del servidor (caché, revalidación: TanStack Query, SWR o Server Components) del estado de UI."
  - id: url
    point: "Usa la URL para estado compartible (filtros, página, tab)."
  - id: global
    point: "Recurre a Context o a un store (Zustand, Redux) para estado de cliente realmente global, considerando re-renders y selectores."
followUps:
  - "¿Qué problema de performance tiene Context con un valor que cambia seguido?"
  - "¿Dónde guardarías el carrito de compras?"
commonMistakes:
  - "Copiar datos del servidor a un store global y sincronizarlos a mano con efectos."
  - "Poner todo en Context y re-renderizar la aplicación entera."
relatedLessons: ["react.state-effects", "react.data-forms", "react.memo-refs-context"]
relatedPatterns: []
---

Pienso el estado por **tipo**:

1. **Estado de UI local** (un modal abierto, el texto de un input): `useState` en el componente que lo usa. Si dos
   hermanos lo necesitan, lo **levanto** al ancestro común.
2. **Estado derivado**: no lo guardo. El total de un carrito se calcula en el render a partir de los ítems.
3. **Estado del servidor**: es una **caché** de datos remotos, con problemas propios (cargando, error, datos viejos,
   revalidar, deduplicar). Lo maneja TanStack Query/SWR o, en Next.js, Server Components con revalidación. Copiarlo a un
   store global y sincronizarlo con efectos es la fuente de bugs más común.
4. **Estado en la URL**: filtros, orden, página, tab activa. Es compartible, sobrevive al refresh y funciona con el botón
   atrás.
5. **Estado global de cliente** (usuario logueado, tema, carrito antes del checkout): Context si cambia poco; si cambia
   seguido o lo leen muchos componentes, un store con **selectores** (Zustand, Redux Toolkit) para que cada componente
   re-renderice sólo cuando cambia lo que lee.

Context re-renderiza a **todos** sus consumidores cuando cambia el valor; por eso conviene separar contextos por
frecuencia de cambio o usar un store externo con `useSyncExternalStore`.
