# ADR-0007: Diagramas con React Flow, simuladores deterministas y autoevaluación en el Interview Arena

- **Estado:** Aceptado — 2026-11-19

## Contexto

La Fase 4 agrega la Pattern Library con diagramas interactivos, el System Design Studio (canvas, simuladores y
desafíos de arquitectura) y el Interview Arena. El MASTER_PROMPT exige no inventar valores numéricos universales
(§14.5), separar modelos simplificados de comportamientos medidos (§15.3) y, sin integración con un LLM, no aparentar
una evaluación semántica automática (§21).

## Decisión

### React Flow 12 para diagramas y canvas

- `@xyflow/react` **12.12.1**. La 13.0 se publicó dos días antes de esta fase: se evita una versión mayor tan
  reciente (política de antigüedad mínima de dependencias, ADR-0002).
- Los **diagramas de patrones** son datos (`content/architecture/diagrams/*.json`) en una grilla lógica; la
  presentación calcula posiciones, límites (cajas que envuelven a sus hijos) y lados de conexión. Así el contenido no
  depende de píxeles y se valida con un test (IDs, conexiones, pasos del recorrido).
- Cada diagrama tiene, además del lienzo, una **lista de elementos accesible por teclado** con el mismo detalle.
- El **canvas** guarda documentos de dominio puros (`CanvasNode`, `CanvasEdge`), no el estado interno de React Flow:
  el formato exportado es propio, versionado (`eal-architecture-canvas` v1) y validado con Zod al importar.
- Exportar imagen usa `html-to-image` **1.11.11**, la versión que recomienda la documentación de React Flow.

### Simuladores: funciones puras, deterministas y verificadas

- Cada simulador es `run(params, seed) → { frames, series, summary }` en el dominio, con un PRNG con semilla
  (mulberry32). La misma configuración reproduce exactamente la misma corrida; la interfaz sólo reproduce la línea
  temporal.
- Las **propiedades que enseña cada simulador se verifican con tests** sobre varias semillas (least connections vs
  round robin con una réplica degradada, el pico en el borde de la ventana fija, el efecto del jitter, la
  idempotencia frente a reentregas, etc.). Los tests detectaron modelos que no mostraban lo que decían y se
  corrigieron antes de publicar.
- Cada simulador declara sus **simplificaciones** y cómo se observa el comportamiento en infraestructura real, y la
  página muestra el aviso "Modelo simplificado".

### Comparador sin números

Las arquitecturas se valoran por dimensión con niveles **relativos y cualitativos** (baja/media/alta) más la
explicación del compromiso. No se muestran puntajes ni colores de "bueno/malo", porque el significado de "alta"
depende de la dimensión.

### Interview Arena: autoevaluación contra criterios explícitos

- Cada pregunta trae **criterios esperados**; después de responder, el usuario marca cuáles cubrió. No hay corrección
  automática del texto ni puntajes inventados.
- Los **criterios faltantes** de la última respuesta se guardan como puntos débiles (`eal:interviews`), alimentan el
  modo de repaso y una regla nueva del recomendador del dashboard (ADR-0005).
- Las ocho fases de una entrevista de System Design son también las secciones del espacio de diseño de cada desafío
  de arquitectura: practicar y simular usan la misma estructura y el mismo componente.
- El live coding reutiliza el workspace de los challenges (tests reales en Web Worker, ADR-0006).

## Alternativas consideradas

- **Mermaid para los diagramas de patrones:** ya se usa en lecciones, pero no permite seleccionar nodos con detalle
  ni recorridos paso a paso de forma accesible.
- **Simulaciones con números aleatorios sin semilla:** más "vivas", pero imposibles de testear y de comparar entre
  configuraciones.
- **Evaluación de respuestas con un LLM:** se evaluará como opcional en la Fase 5 (AI Study Mentor), con proveedor
  intercambiable y sin reemplazar la autoevaluación.

## Consecuencias

- El contenido de arquitectura es versionado y validado como el resto (`tests/content/architecture-content.test.ts`).
- Los diagramas del canvas y el historial de entrevistas viven en el navegador hasta la Fase 6.
- Agregar un simulador requiere escribir el modelo y los tests de sus propiedades, no sólo la interfaz.
