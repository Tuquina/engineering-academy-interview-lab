# ADR-0009: AI Agents Lab con proveedor local determinista, loop de herramientas en la aplicación y evals estadísticas

- **Estado:** Aceptado — 2026-11-19

## Contexto

La Fase 5 implementa el laboratorio de agentes (MASTER_PROMPT §16.3 a §16.7) y el AI Study Mentor opcional (§30).
Las reglas que condicionan el diseño:

- Debe poder practicarse **sin API key** con un proveedor local determinista, y nunca presentar una simulación como
  la respuesta de un modelo real.
- Si hay un proveedor real, la interfaz debe estar **desacoplada** y las credenciales sólo en el servidor.
- Las evaluaciones deben distinguir verificaciones **deterministas** de resultados **probabilísticos**, no evaluar
  sólo por coincidencia literal de texto y permitir un **quality gate** que bloquee publicar.
- El servidor no ejecuta código ni SQL del usuario.

## Decisión

### Puerto `LlmProvider` y loop de herramientas en la aplicación

- `LlmProvider.generate(request)` representa **un paso** del modelo con un formato de mensajes propio, neutral
  (`text`, `tool_use`, `tool_result`). El loop (`runAgentTurn`) vive en la capa de aplicación: arma el contexto,
  aplica timeout, reintentos con backoff y fallback, valida y ejecuta herramientas y registra trazas. Así la misma
  lógica, con sus límites, funciona con el proveedor local o con uno real.
- Las herramientas son **funciones puras** sobre un mundo de cobranzas ficticio (`CollectionsWorld`). Cada llamada
  pasa por tres barreras, en orden: herramienta habilitada para el agente → esquema Zod de los argumentos → reglas de
  negocio y políticas (plazo de promesa, horario, disputas, cliente de la sesión). La traza guarda argumentos,
  validación, resultado, error, estado anterior y posterior, cambios y tiempo.
- El mundo y el loop corren en el **navegador**: los datos son ficticios y no hace falta un servidor para practicar.

### Proveedor local determinista

- `LocalDeterministicProvider` interpreta el mensaje con reglas explícitas (`local-intents.ts`), arma un plan de
  herramientas según la configuración estructurada (herramientas, políticas, memoria, tono) y redacta con plantillas.
  **No lee el system prompt**; la interfaz lo dice en un aviso permanente.
- `model.variability` (0 a 1) introduce, con una semilla, variaciones de redacción y errores típicos de agentes reales
  (no consultar herramientas, omitir la presentación como IA, presionar con frases prohibidas, intentar leer datos de
  otro cliente). Sirve para practicar evaluaciones repetidas; misma semilla, mismo resultado. Se documenta que no es
  la `temperature` de un modelo.

### Proveedor real (opcional) detrás de Route Handlers

- `@anthropic-ai/sdk` **1.8.0** (la 1.10.0 tenía dos días; se respeta la política de no adoptar versiones muy
  recientes). Modelo por defecto `claude-opus-5-5`, configurable entre una lista permitida (control de costos).
- El navegador usa `HttpLlmProvider` contra `/api/agent-lab/generate`; el servidor recibe sólo los **nombres** de las
  herramientas y arma sus definiciones (con `strict: true`). El contenido del asistente se reenvía **sin cambios**
  (`providerContent`), porque los modelos actuales devuelven razonamiento firmado que debe volver intacto en los pasos
  siguientes. Por la misma razón, con un proveedor real la historia no se recorta por ventana: se limita su longitud.
- LLM as Judge (`/api/agent-lab/judge`) usa **salidas estructuradas** (`messages.parse` + `zodOutputFormat`); no se
  fuerza `tool_choice`, que los modelos actuales rechazan.
- Protección (`request-guard.ts`): 503 sin key, mismo origen, tamaño máximo, límite por minuto por cliente y
  presupuesto diario. Los contadores son por proceso; con varias instancias haría falta un almacén compartido.
- El SDK se crea con `maxRetries: 0`: los reintentos los decide la política del agente, y quedan en la traza.

### Configuración y versionado

- `AgentConfig` separa texto para el modelo (identidad, prompt con variables, objetivo, reglas) de políticas
  verificables por código. La voz es una propiedad versionada; el laboratorio no sintetiza audio.
- Versiones **inmutables** numeradas; publicar elige la versión activa; rollback es publicar una anterior y queda en
  el historial. El diff entre versiones es campo a campo.
- Estado en `localStorage` (`eal:agent-lab`, ADR-0004) validado con Zod. El ejemplo trae v1 (publicada, con fallas de
  cumplimiento) y v2 (mejorada) para comparar.

### Evaluaciones

- Golden dataset de 13 casos (funcionales, tool calling, seguridad, cumplimiento, memoria) más casos propios.
- Tres clases de verificación, siempre rotuladas: **deterministas** (herramientas, argumentos, estado), **semánticas
  heurísticas** (conjuntos de sinónimos sobre texto normalizado) y **LLM as Judge** (sólo con proveedor real; si no,
  se marcan como omitidas, nunca como aprobadas).
- Repeticiones con semilla por caso y repetición, iguales para A y B (comparación pareada). Tasa de aprobación con
  **intervalo de Wilson al 95 %**; un caso es inestable si pasa en unas repeticiones y falla en otras.
- Una diferencia entre versiones se declara mejora o regresión sólo si los intervalos **no se superponen** (control
  de falsos positivos). Con 3 repeticiones ni un 0 contra 100 % es concluyente; con 5 sí.
- **Quality gate** configurable (tasa mínima, opcionalmente sobre el límite inferior del intervalo, casos críticos al
  100 %, repeticiones mínimas, latencia p95). Se recalcula sobre la última evaluación guardada de la versión. El
  rollback no pasa por el gate: es el camino de emergencia.
- Latencia medida en el navegador; costo estimado sólo con tokens reales y precios de lista de referencia.

### Memoria

- Tres fuentes con distinta autoridad: memoria conversacional (afirmaciones con fecha, vencimiento y reemplazo),
  estado del negocio (la verdad para decidir) e historial de eventos. Ante una contradicción gana el sistema de
  registro. La memoria nunca habilita una acción que el estado prohíbe (`decideContactEligibility`).

### AI Study Mentor

- Módulo `mentor` con su propio puerto (`MentorModel`). Enseña antes de revelar soluciones; nueve modos de ayuda. El
  contexto de la lección y el progreso se envían **sólo si la persona lo marca**. Sin key se muestra deshabilitado y
  explica cómo activarlo.

## Consecuencias

- Todo el laboratorio funciona sin red ni credenciales; los tests nunca llaman a la API (el adaptador se prueba con un
  cliente falso).
- El proveedor local no generaliza como un LLM: los casos propios con frases que sus reglas no cubren fallarán con él.
  Es esperable y se explica en la interfaz.
- El comportamiento con el modelo real no está verificado en esta fase (no hay key en el entorno de desarrollo): el
  contrato del adaptador está probado con un cliente falso y los tipos del SDK.
- Los límites de uso en memoria no sirven para varias instancias; la Fase 6/7 puede moverlos a Redis o PostgreSQL.
