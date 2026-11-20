---
id: iq.rag-design
format: deep-dive
question: "Diseñá un asistente que responda preguntas sobre la documentación interna de una empresa usando RAG."
expectedPoints:
  - id: ingestion
    point: "Ingesta: extraer texto, dividir en chunks con solapamiento y metadatos (fuente, fecha, permisos) y generar embeddings."
  - id: retrieval
    point: "Recuperación híbrida (vectorial + léxica), filtros por permisos del usuario y reranking."
  - id: generation
    point: "Generación con instrucciones de responder sólo con el contexto, citar fuentes y decir cuando no sabe."
  - id: eval
    point: "Evalúa por separado la recuperación (recall@k) y la respuesta (fidelidad, utilidad) con un dataset de preguntas reales."
  - id: ops
    point: "Mantiene el índice actualizado (reindexar cambios, borrar documentos eliminados) y monitorea costo y latencia."
followUps:
  - "¿Cómo evitás que un empleado obtenga información de documentos a los que no tiene acceso?"
  - "¿Cómo elegís el tamaño de los chunks?"
commonMistakes:
  - "Filtrar permisos después de generar la respuesta en lugar de en la recuperación."
  - "Evaluar sólo la respuesta final sin saber si falló la recuperación o la generación."
relatedLessons: ["llm-agents.hallucinations-rag", "llm-agents.evals"]
relatedPatterns: []
---

**Ingesta**: extraigo el texto de cada fuente, lo divido en **chunks** (por secciones o por tamaño, con algo de
solapamiento) y guardo metadatos: documento, título, fecha, URL y **quién puede verlo**. Genero embeddings y los guardo
en un índice vectorial (pgvector en PostgreSQL alcanza para empezar).

**Recuperación**:

- Búsqueda **híbrida**: similitud vectorial + búsqueda léxica (BM25), porque los embeddings fallan con nombres propios,
  códigos o siglas.
- **Filtro de permisos en la consulta**: sólo se recuperan chunks que el usuario puede ver. Filtrar después de generar es
  tarde: el modelo ya leyó el contenido.
- **Reranking** de los top-k candidatos con un modelo cross-encoder para quedarme con los más relevantes.

**Generación**: el prompt incluye los fragmentos con su fuente y pide responder **sólo con ese contexto**, citar las
fuentes y decir "no encontré información" si no está. La interfaz muestra los enlaces citados.

**Evaluación**: un dataset de preguntas reales con los documentos que deberían recuperarse. Mido la recuperación
(recall@k: ¿el documento correcto está entre los recuperados?) y, por separado, la respuesta (fidelidad al contexto,
utilidad), con LLM-as-judge calibrado y revisión humana por muestreo.

**Operación**: reindexado incremental cuando cambian documentos, borrado de lo eliminado, y métricas de latencia, costo
y respuestas sin resultado para detectar huecos en la documentación.
