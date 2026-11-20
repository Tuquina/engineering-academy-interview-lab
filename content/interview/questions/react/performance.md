---
id: iq.react-performance
format: quick
question: "Una pantalla de React se siente lenta. ¿Cómo lo investigás y qué optimizaciones aplicarías?"
expectedPoints:
  - id: measure
    point: "Mide primero con el Profiler de React DevTools y las herramientas de performance del navegador."
  - id: structure
    point: "Corrige la estructura antes de memorizar: bajar el estado, pasar contenido como children, dividir componentes."
  - id: memo
    point: "Usa memo, useMemo y useCallback sólo donde el profiler muestra renders caros evitables."
  - id: lists
    point: "Virtualiza listas largas y usa keys estables."
  - id: other
    point: "Considera también bundle size (code splitting), useTransition/useDeferredValue y trabajo fuera del render."
followUps:
  - "¿Por qué un useCallback no sirve si el hijo no está envuelto en memo?"
  - "¿Qué hace useDeferredValue?"
commonMistakes:
  - "Envolver todo en useMemo y useCallback sin medir."
  - "Asumir que el problema es React cuando es una request lenta o un bundle enorme."
relatedLessons: ["react.memo-refs-context", "react.rendering-reconciliation"]
relatedPatterns: []
---

Primero **mido**: el Profiler de React DevTools muestra qué componentes se renderizan, por qué y cuánto tardan; la
pestaña Performance del navegador muestra si el problema es JavaScript, layout, red o el tamaño del bundle.

Si el problema son renders de más, antes de memorizar arreglo la **estructura**:

- **Bajar el estado**: si un input en la raíz re-renderiza toda la página en cada tecla, el estado va al componente
  del input.
- **Contenido como `children`**: un componente que cambia seguido y recibe el resto como `children` no los re-renderiza.

Después, donde el profiler lo justifica: `memo` en componentes caros con props estables, `useMemo` para cálculos
pesados y `useCallback` para que una función no rompa el `memo` del hijo (sin `memo` en el hijo, `useCallback` no
aporta).

Otras palancas: **virtualizar** listas largas (renderizar sólo lo visible), **keys estables**, `useTransition` o
`useDeferredValue` para que una actualización pesada (filtrar 10.000 filas) no bloquee el tipeo, y **code splitting**
con imports dinámicos para bajar el JavaScript inicial. A veces lo lento no es React: es una cascada de requests o datos
que deberían venir del servidor ya listos.
