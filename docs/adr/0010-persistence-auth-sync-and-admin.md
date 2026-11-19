# ADR-0010: PostgreSQL con Drizzle, sesiones propias, sincronización por documentos y contenido estructurado

- **Estado:** Aceptado — 2026-11-19

## Contexto

La Fase 6 agrega persistencia, autenticación, sincronización entre navegadores, administración de contenido,
importación/exportación, seguridad y optimización (MASTER_PROMPT §8.4, §27, §28, §29). Restricciones:

- Todo debe funcionar en local con Docker, incluida la base, y seguir funcionando **sin** base (modo invitado).
- Un único ORM; migraciones versionadas; sin Redis como base primaria del usuario.
- Autenticación y autorización reales; nunca confiar sólo en la interfaz para proteger acciones administrativas.
- Sincronizar el progreso local con la cuenta **sin duplicados**.
- El contenido creado desde la web no se ejecuta como MDX.

## Decisión

### PostgreSQL 17 + Drizzle ORM 0.45 + `pg` 8.23

- `docker compose up app` levanta `db` (postgres:17-alpine, volumen `pgdata`), aplica migraciones
  (`pnpm db:migrate`, idempotente) y arranca la app. Los E2E usan `db-e2e` en memoria (tmpfs).
- Drizzle (versión estable más reciente con semanas de antigüedad; la 1.0 sigue en RC). Esquema por módulo en su
  capa de infraestructura y reunido en `src/infrastructure/database/schema.ts`; migraciones SQL generadas con
  `drizzle-kit` en `drizzle/` y versionadas.
- Los repositorios dependen del tipo común `PgDatabase`: en producción `node-postgres` con pool chico (apto para
  funciones serverless con el pooler de Neon o Supabase) y en tests **PGlite** en proceso con las mismas migraciones.
  Así los tests de integración usan un PostgreSQL real sin Docker ni red.
- Sin `DATABASE_URL`, todo lo que requiere base responde 503 o se muestra deshabilitado y la app sigue en modo
  invitado.

### Autenticación propia, mínima y real

- Email y contraseña (scrypt de Node con sal y parámetros en el hash; política de largo mínimo) y GitHub OAuth
  opcional (flujo de código con `state` en cookie `HttpOnly`; vincula por email sólo si GitHub lo verificó).
- Sesiones en la tabla `sessions` guardando **sólo el SHA-256** del token; cookie `HttpOnly`, `SameSite=Lax`,
  `Secure` en producción, 30 días con renovación deslizante. Se descartaron Auth.js y Better Auth: agregan
  configuración y tablas que esta plataforma personal no necesita, y escribir el flujo es parte del aprendizaje.
- Roles `user` y `admin`. La **primera cuenta** de la instalación es admin (con un lock asesor para evitar la
  carrera); además `ADMIN_EMAILS` y `ADMIN_GITHUB_LOGINS`. El registro posterior está cerrado salvo
  `AUTH_ALLOW_SIGNUP=true`.
- Defensa en profundidad: verificación de mismo origen (cabecera `Host`/`X-Forwarded-Host`, porque `request.url`
  refleja la dirección interna en Docker o detrás de un proxy), límite de intentos de login por IP y email,
  mensajes que no revelan si un email existe, y **autorización en los casos de uso** (no sólo en la página).

### Sincronización: un documento versionado por store

- Los 8 stores del cliente (progreso, notas, flashcards, preferencias, práctica, Studio, Interview Arena, AI Agents
  Lab) se replican como documentos JSONB en `user_documents (user_id, store_key, revision, data)`. Es la
  representación equivalente de UserProgress, QuizAttempts, FlashcardReviews, UserNotes, Bookmarks,
  InterviewSessions, ArchitectureProjects y UserPreferences del §28: el servidor no necesita consultarlos por
  campo y normalizarlos sólo agregaría tablas.
- Escrituras condicionales (`WHERE revision = esperada` / `ON CONFLICT DO NOTHING`): concurrencia optimista sin
  locks; ante conflicto, el servidor devuelve el documento actual.
- El cliente guarda el **ancestro común** y hace un **merge de tres vías** genérico: respeta borrados, combina listas
  por `id` o como conjuntos y resuelve conflictos con reglas idempotentes (`completed` gana, fechas de inicio mínimas,
  otras fechas máximas, contadores máximos). Reintentar una subida nunca duplica datos.
- `localStorage` sigue siendo la caché local (funciona sin red); `SyncedStore` envuelve cada store y los componentes
  no cambian. Al iniciar sesión, los datos de invitado se combinan con la cuenta; al cerrar sesión (o vencer) se
  borran de ese navegador los datos que pertenecían a la cuenta. Datos de otra cuenta nunca se mezclan.
- El servidor valida cada documento con el **mismo esquema Zod** que usa el navegador.
- Copia de seguridad del usuario (`eal-user-data` v1): exportar e importar (combinando) funciona también sin cuenta.

### Contenido personalizado como datos estructurados

- Tablas `custom_courses`, `custom_lessons`, `custom_flashcards`, `content_versions` y `audit_log`. Las lecciones
  son **bloques tipados** (título, párrafo, lista, código, aviso, diagrama Mermaid, pregunta autocorregible)
  validados con Zod y renderizados con componentes controlados: React escapa el texto, Shiki escapa el código y
  Mermaid corre con `securityLevel: "strict"`. No hay MDX ni HTML provisto por usuarios.
- IDs estables `custom.<uuid>` para progreso y preguntas: renombrar un slug no pierde progreso.
- Guardar un curso es un documento completo con **versión esperada**; en una transacción se reemplazan lecciones y
  flashcards, se incrementa la versión y se guarda una instantánea. Restaurar crea una versión nueva.
- Integridad antes de guardar y de publicar: área existente, módulos y slugs únicos, lecciones en módulos válidos,
  prerrequisitos existentes (repositorio o personalizados), preguntas con exactamente una respuesta correcta.
- Rutas públicas genéricas `/c/[curso]` y `/c/[curso]/[lección]` (las mismas piezas visuales que las lecciones del
  repositorio): una temática nueva no requiere pantallas nuevas. La Biblioteca agrega los cursos publicados desde el
  navegador para que publicar no requiera recompilar.
- Importación/exportación `eal-content` v1: sin UUID, prerrequisitos internos como `curso/lección`, idempotente por
  slug (`skip` o `replace` con versión). El contenido del repositorio (`content/`) nunca se escribe desde la web.

### Seguridad y optimización

- Cabeceras `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`; `no-store` en
  páginas de cuenta y administración. Tamaños máximos en todos los cuerpos JSON.
- Índices en sesiones (usuario, vencimiento), estado de cursos, lecciones por curso y posición, auditoría por
  fecha. Un curso se lee con tres consultas fijas (sin N+1). Limpieza oportunista de sesiones vencidas (sin cron).

## Consecuencias

- La app funciona igual sin base; con `docker compose up app`, la base local está lista sin pasos manuales.
- Los repositorios se prueban contra un PostgreSQL real (PGlite) en Vitest; los E2E, contra PostgreSQL 17.
- La sincronización por documento sube el store completo en cada cambio (con agrupación de 1,2 s). Con volúmenes
  grandes convendría sincronizar por registro; para uso personal el documento más grande ronda decenas de KB.
- Los contadores en conflicto toman el máximo: dos dispositivos que responden la misma pregunta sin conexión
  cuentan como un intento. Es el costo de la idempotencia; se documenta.
- Límites de intentos y presupuestos en memoria del proceso: con varias instancias haría falta Redis (Fase 7).
- No hay todavía Content-Security-Policy estricta (Monaco, Sandpack y los workers requieren excepciones).
