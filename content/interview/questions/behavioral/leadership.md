---
id: iq.leadership-without-authority
format: deep-dive
question: "Contame una vez que impulsaste un cambio importante sin tener autoridad formal."
expectedPoints:
  - id: problem
    point: "Identifica un problema real que afectaba al equipo o al producto."
  - id: proposal
    point: "Propone una solución y la respalda con datos, un prototipo o una prueba piloto."
  - id: influence
    point: "Describe cómo consiguió apoyo: escuchar objeciones, involucrar a otros, empezar chico."
  - id: execution
    point: "Explica cómo se ejecutó y su rol en llevarlo adelante."
  - id: impact
    point: "Cuantifica el resultado y qué quedó instalado en el equipo."
followUps:
  - "¿Quién se opuso y cómo lo manejaste?"
  - "¿Qué harías si el cambio no hubiera funcionado?"
commonMistakes:
  - "Contar una tarea asignada como si fuera iniciativa propia."
  - "Mostrar que se impuso el cambio sin consenso."
relatedLessons: []
relatedPatterns: []
---

- **Situación**: los tests end-to-end del equipo tardaban 40 minutos y fallaban al azar, así que nadie confiaba en
  ellos y se mergeaba con el CI en rojo.
- **Acción**: medí durante dos semanas qué tests fallaban y por qué: el 70 % de los fallos venía de cinco tests con
  esperas fijas. Armé una propuesta corta con esos datos y un prototipo que reemplazaba esperas por condiciones y
  paralelizaba la suite. La presenté en la retrospectiva, escuché las objeciones (miedo a perder cobertura) y acordamos
  una prueba de dos semanas.
- **Resultado**: la suite bajó a 9 minutos y la tasa de fallos al azar a menos del 1 %; el equipo adoptó la regla de no
  mergear con CI rojo y yo escribí la guía para escribir tests estables.

Lo que muestra esta historia es **iniciativa, influencia con datos y seguimiento**, que es lo que se espera de un perfil
senior aunque no tenga personas a cargo.
