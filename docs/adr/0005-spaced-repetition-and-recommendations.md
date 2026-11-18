# ADR-0005: Repetición espaciada (SM-2 adaptado) y recomendaciones por reglas

- **Estado:** Aceptado — 2026-11-18

## Contexto

La Fase 2 requiere flashcards con repetición espaciada documentada y un sistema que sugiera qué practicar sin
depender de IA (MASTER_PROMPT §22). Ambos deben ser explicables al usuario.

## Decisión

### Flashcards: SM-2 con tres adaptaciones

Se implementa SM-2 (`src/modules/flashcards/domain/spaced-repetition.ts`) con estas diferencias respecto del original:

1. **Reaprendizaje en la sesión:** una tarjeta fallada (q < 3) vuelve a los 10 minutos en lugar de al día siguiente.
2. **Cuatro botones** (Otra vez, Difícil, Bien, Fácil) que corresponden a q = 1, 3, 4, 5.
3. **Límite diario de tarjetas nuevas** configurable (por defecto 10) para que la carga futura sea sostenible.

Cada botón muestra el intervalo que produciría, de modo que el algoritmo es visible.

Alternativa considerada: **FSRS**. Predice mejor la retención, pero requiere parámetros entrenados con historial que
todavía no existe y es más difícil de explicar. Se puede reemplazar el planificador más adelante sin tocar la UI,
porque la interfaz del dominio (`scheduleReview`, `buildStudyQueue`) no expone detalles de SM-2.

### Recomendaciones: reglas priorizadas y explicadas

`buildRecommendations` (`src/modules/progress/application/recommendations.ts`) aplica, en orden: flashcards vencidas,
lecciones con respuestas incorrectas vigentes, conceptos con fallos repetidos en flashcards, prerrequisitos
faltantes, lecciones empezadas y la próxima lección de la ruta activa. Cada recomendación incluye su motivo.

## Consecuencias

- El comportamiento es determinista y testeable; no hay costos ni latencia de un modelo.
- Las reglas son simples a propósito: cuando haya más señales (challenges, entrevistas simuladas) se agregan reglas
  nuevas con su propio motivo, sin convertir el sistema en una caja negra.
