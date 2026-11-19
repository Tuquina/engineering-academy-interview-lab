# ADR-0011: Producción en Vercel con PostgreSQL de Supabase

- **Estado:** Aceptado — 2026-11-19

## Contexto

La Fase 7 publica la plataforma como MVP usable desde cualquier dispositivo. Restricciones: nada instalado en la PC
(ADR-0001), mínimo de servicios externos, la app debe seguir funcionando igual en local con Docker y el progreso
tiene que sincronizarse entre dispositivos (Fase 6). También se evaluó convertirla en una app de escritorio con
instalador.

## Decisión

- **Vercel** para la app (región `gru1`, São Paulo): las ~170 páginas de contenido se prerenderizan en el build y la
  API son Route Handlers cortos. No hace falta ningún cambio de arquitectura.
- **Supabase sólo como PostgreSQL 17** (región `sa-east-1`, plan gratuito), vía su pooler en modo transacción. No se
  usan ni su autenticación ni su API de datos: la autenticación propia (ADR-0010) y Drizzle siguen igual, y la base
  se puede mover a Neon o a cualquier PostgreSQL cambiando sólo `DATABASE_URL`.
- **Rol propio `eal_app`** dueño de las tablas, en lugar del usuario `postgres`: la credencial de la app no puede
  tocar los esquemas internos de Supabase.
- **Row Level Security activo y sin políticas** en todas las tablas: Supabase expone `public` por su API de datos, y
  así sus roles `anon`/`authenticated` no ven nada. Un test exige RLS en toda tabla nueva.
- **Migraciones en el build** (`pnpm db:migrate && pnpm build`): si una migración falla, no se publica la versión.
  Las migraciones son aditivas, así que la versión anterior sigue funcionando contra el esquema nuevo durante el
  despliegue.
- **Límite de intentos de login en la base** (`auth_attempts`, ventana fija con un `INSERT … ON CONFLICT` atómico):
  en serverless cada instancia tiene su propia memoria y un límite en memoria no protege. Las claves se guardan
  hasheadas. Se descartó Redis (Upstash) para no sumar otro servicio.
- **Primera cuenta reservada:** con `ADMIN_EMAILS` configurado, sólo ese email puede crear la primera cuenta
  (admin); en una URL pública nadie puede adelantarse. En local sin configuración se mantiene el comportamiento de la
  Fase 6.
- **Previews sin base:** los despliegues de ramas no reciben `DATABASE_URL` y funcionan en modo invitado, así nunca
  escriben en producción.
- **CI en GitHub Actions** con los mismos contenedores que en local (`pnpm check` y E2E con PostgreSQL efímero).
  Vercel despliega cada push a `main` en paralelo; el CI informa si ese commit rompe algo.

### App de escritorio: descartada por ahora

Empaquetar Next.js con Electron obligaría a reemplazar PostgreSQL por una base local (PGlite en archivo), a firmar y
actualizar un instalador de ~200 MB y a perder la sincronización entre dispositivos salvo que siguiera existiendo un
servidor. La sensación de lentitud que la motivó venía del servidor de desarrollo, no de la arquitectura (ver la
sección de performance de STATUS). Si se quiere una ventana propia, una PWA instalable usa el mismo despliegue.

## Consecuencias

- Costo mensual: $0 con los planes gratuitos (Vercel Hobby, Supabase Free). El plan gratuito de Supabase pausa el
  proyecto tras una semana sin uso; se reanuda desde su panel sin perder datos.
- La conexión usa TLS sin validar la CA de Supabase (`uselibpqcompat=true&sslmode=require`). Para validarla haría
  falta incluir su certificado raíz en el despliegue.
- Los límites del AI Agents Lab y del Mentor siguen en memoria por instancia; sólo importan si se configura una API
  key real.
- El CI no bloquea el despliegue (Vercel publica al recibir el push). Para bloquearlo habría que proteger `main` y
  trabajar con pull requests.
