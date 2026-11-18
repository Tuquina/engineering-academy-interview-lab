# ADR-0004: Progreso de invitado en localStorage detrás de un puerto

- **Estado:** Aceptado — 2026-11-18

## Decisión

El progreso (lecciones iniciadas/completadas, última visita) se modela en `src/modules/progress/domain` como funciones
puras sobre un estado inmutable. La persistencia se abstrae con el puerto `ProgressStore`; la primera implementación
usa `localStorage` con un esquema versionado y validado (datos corruptos ⇒ estado vacío, sin romper la UI).

## Consecuencias

- Funciona sin backend ni cuenta (modo invitado, MASTER_PROMPT §29).
- El progreso no se comparte entre navegadores hasta la Fase 6 (PostgreSQL + autenticación + sincronización).
- La UI lo indica explícitamente; no se muestran métricas que todavía no se registran (rachas, minutos de estudio).
