---
id: iq.rerenders
format: deep-dive
question: "¿Qué provoca un re-render en React y cómo evitarías renders innecesarios cuando son un problema?"
expectedPoints:
  - id: triggers
    point: "Un componente se vuelve a renderizar cuando cambia su estado, cuando se renderiza su padre o cuando cambia un contexto que consume."
  - id: render-not-commit
    point: "Renderizar no es tocar el DOM: React compara y sólo aplica las diferencias; muchos renders son baratos."
  - id: measure
    point: "Medir antes de optimizar (React DevTools Profiler) para encontrar renders realmente costosos."
  - id: structure
    point: "Primero reestructurar: bajar el estado al componente que lo usa o pasar componentes como children."
  - id: memo
    point: "Después, memoización: React.memo, useMemo y useCallback con referencias estables (o el React Compiler)."
followUps:
  - "¿Por qué un objeto literal en las props rompe React.memo?"
  - "¿Cómo dividirías un contexto que cambia seguido?"
commonMistakes:
  - "Envolver todo en useMemo y useCallback sin medir."
  - "Creer que cada render actualiza el DOM completo."
relatedLessons: []
---

Un componente se re-renderiza cuando **cambia su estado**, cuando **se renderiza su padre** (aunque sus props no
cambien) o cuando cambia el valor de un **contexto** que consume. Renderizar significa volver a ejecutar la función
del componente; después React compara el resultado y **sólo aplica al DOM las diferencias**. La mayoría de los
renders son baratos y no hay que evitarlos.

Cuando sí son un problema (listas grandes, componentes costosos, inputs que se sienten lentos), el orden es:

1. **Medir** con el Profiler de React DevTools para encontrar qué componente cuesta.
2. **Reestructurar**: mover el estado más abajo, al componente que lo usa, o pasar el subárbol costoso como
   `children` para que no dependa del estado del padre. Dividir contextos que cambian seguido.
3. **Memoizar**: `React.memo` en el componente costoso, y `useMemo`/`useCallback` para que las props sean
   referencialmente estables. El React Compiler automatiza gran parte de esto.
4. Para listas muy largas, **virtualización**.
