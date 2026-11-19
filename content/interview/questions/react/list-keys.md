---
id: iq.list-keys
format: quick
question: "¿Por qué React necesita la prop key en las listas y qué problema causa usar el índice?"
expectedPoints:
  - id: identity
    point: "key identifica cada elemento entre renders para que React sepa cuál se movió, agregó o eliminó."
  - id: stable
    point: "Debe ser estable y única entre hermanos, idealmente un ID del dato."
  - id: index-problem
    point: "Con el índice, al insertar, borrar o reordenar, el estado interno (inputs, foco) queda asociado al elemento equivocado."
  - id: reset
    point: "Cambiar la key de un componente lo desmonta y monta de nuevo: sirve para reiniciar su estado a propósito."
followUps:
  - "¿Cuándo es aceptable usar el índice como key?"
  - "¿Cómo usarías key para reiniciar un formulario al cambiar de entidad?"
commonMistakes:
  - "Usar Math.random() como key, que fuerza a recrear todo en cada render."
  - "Creer que key es sólo para silenciar el warning."
relatedLessons: []
---

React usa `key` para **asociar cada elemento de una lista con su instancia entre renders**. Con keys estables
(el ID del deudor, de la deuda), React sabe qué elemento se movió, cuál es nuevo y cuál se eliminó, y conserva el
estado interno de cada componente.

Si se usa el **índice**, al insertar un elemento al principio o reordenar, los índices se corren: React reutiliza
la instancia del índice 0 para un dato distinto, y el estado interno (un input no controlado, el foco, un
acordeón abierto) aparece en la fila equivocada. El índice sólo es aceptable en listas estáticas que no se
reordenan ni filtran.

Como `key` define la identidad, **cambiarla a propósito** desmonta y vuelve a montar el componente: es la forma
idiomática de reiniciar el estado de un formulario al pasar de un deudor a otro.
