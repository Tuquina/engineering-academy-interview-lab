---
id: iq.ci-cd-pipeline
format: quick
question: "¿Cómo armarías un pipeline de CI/CD para una aplicación web?"
expectedPoints:
  - id: stages
    point: "Etapas en orden de costo: instalar con lockfile, lint y formato, typecheck, tests, build, e2e."
  - id: gate
    point: "Protege la rama principal: PR obligatorio con checks en verde y revisión."
  - id: artifact
    point: "Construye un artefacto inmutable (imagen) una vez y lo promueve entre entornos."
  - id: deploy
    point: "Despliega con una estrategia segura (rolling, blue/green o canary) y rollback rápido."
  - id: migrations
    point: "Coordina migraciones de base compatibles hacia atrás con el despliegue."
followUps:
  - "¿Cómo hacés que el pipeline sea rápido?"
  - "¿Dónde guardás los secretos que usa el pipeline?"
commonMistakes:
  - "Recompilar el artefacto en cada entorno, perdiendo la garantía de que es lo mismo que se probó."
  - "Desplegar migraciones destructivas junto con el código que todavía usa la columna."
relatedLessons: ["nextjs.production"]
relatedPatterns: []
---

**CI** (en cada push y PR):

1. Instalar dependencias con el lockfile congelado.
2. Formato y lint (lo más barato primero, para fallar rápido).
3. Typecheck.
4. Tests unitarios y de integración con servicios efímeros (base en un contenedor).
5. Build.
6. E2E de los flujos críticos contra el build.

La rama principal está **protegida**: sólo entra por PR con checks en verde y al menos una revisión.

**CD**: construyo **una vez** un artefacto inmutable (una imagen Docker con el hash del commit) y lo promuevo de staging
a producción, así lo que llega a producción es exactamente lo que se probó. El despliegue es gradual (rolling o canary)
con health checks y un **rollback** de un paso.

Las **migraciones** siguen expand/contract: primero cambios compatibles (agregar columna nullable), después el código
nuevo, y recién en un despliegue posterior se borra lo viejo.

Para que sea rápido: caché de dependencias y de capas de Docker, paralelizar jobs y separar tests lentos. Los secretos
viven en el gestor de secretos del proveedor de CI o de la nube, con permisos mínimos y, si se puede, credenciales de
corta duración (OIDC) en lugar de claves fijas.
