# Despliegue en Vercel + Supabase

Producción: <https://engineering-academy-interview-lab.vercel.app> (proyecto `engineering-academy-interview-lab` en
Vercel, base `engineering-academy-interview-lab` en Supabase, región São Paulo). Las decisiones están en
[ADR-0011](../adr/0011-production-on-vercel-and-supabase.md).

## Cómo se despliega

1. Un push a `main` en GitHub dispara dos cosas en paralelo:
   - **Vercel** compila y publica (`vercel.json`): `pnpm install --frozen-lockfile`, después `pnpm db:migrate`
     (aplica las migraciones pendientes de `drizzle/` contra Supabase) y `pnpm build`.
   - **GitHub Actions** (`.github/workflows/ci.yml`) corre `pnpm format:check` y `pnpm check` (typecheck, lint, tests
     y build) y los E2E con Playwright, con los mismos contenedores de Docker que en local.
2. Las ramas y los pull requests generan despliegues de **preview** sin base de datos (modo invitado): nunca
   escriben en la base de producción.

Si una migración falla, el build falla y la versión anterior sigue publicada.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable                       | Entorno            | Valor                                                                                     |
| ------------------------------ | ------------------ | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Production         | Pooler de Supabase en modo transacción (puerto 6543) con el rol `eal_app` (ver abajo)     |
| `ADMIN_EMAILS`                 | Production/Preview | Email del administrador: el único que puede crear la primera cuenta                       |
| `AUTH_ALLOW_SIGNUP`            | Production/Preview | `false`: sólo existe la cuenta del administrador                                          |
| `DATABASE_POOL_MAX`            | Production/Preview | `3` conexiones por instancia                                                              |
| `ENABLE_EXPERIMENTAL_COREPACK` | Production/Preview | `1`: Vercel usa el pnpm fijado en `packageManager`                                        |
| `ANTHROPIC_API_KEY`, `AI_*`    | opcional           | Activa el modelo real en el AI Agents Lab y el Mentor; sin ella se usa el proveedor local |
| `GITHUB_CLIENT_ID`/`_SECRET`   | opcional           | Inicio de sesión con GitHub (callback `https://<dominio>/api/auth/github/callback`)       |

Después de cambiar una variable hay que volver a desplegar (Deployments → ⋯ → Redeploy).

## Base de datos en Supabase

La app no usa la API de datos ni la autenticación de Supabase: sólo su PostgreSQL. Se conecta con un rol propio,
`eal_app`, dueño de las tablas y sin acceso al resto de la base:

```sql
CREATE ROLE eal_app LOGIN PASSWORD '<contraseña aleatoria>';
GRANT CREATE, CONNECT ON DATABASE postgres TO eal_app;
GRANT USAGE, CREATE ON SCHEMA public TO eal_app;
```

Formato de `DATABASE_URL` (el usuario del pooler lleva el id del proyecto):

```text
postgres://eal_app.<project-ref>:<contraseña>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true
```

`sslmode=require&uselibpqcompat=true` cifra la conexión con la semántica de libpq (sin validar la cadena del
certificado, que Supabase firma con su propia CA).

Todas las tablas tienen **Row Level Security** activo y sin políticas (`drizzle/0002_enable_rls.sql`): los roles
`anon` y `authenticated` de la API de Supabase no pueden leer nada. El rol dueño no está sujeto a RLS, así que la app
funciona igual. `tests/architecture/database-rls.test.ts` falla si una tabla nueva no lo activa. El aviso "RLS
enabled, no policy" del panel de Supabase es esperado.

### Cambiar la contraseña de `eal_app`

En el SQL Editor de Supabase: `ALTER ROLE eal_app PASSWORD '<nueva>';`, actualizar `DATABASE_URL` en Vercel y
redesplegar.

### Plan gratuito

Supabase pausa los proyectos gratuitos tras una semana sin actividad. Si la app responde con errores de base, entrá
al panel de Supabase y reanudá el proyecto (Restore). Los datos se conservan.

## Primer uso

1. Abrí `/login` → "Crear cuenta" con el email configurado en `ADMIN_EMAILS`. Esa cuenta es la administradora; con
   cualquier otro email el registro está cerrado.
2. Al iniciar sesión, el progreso que tenías como invitado en ese navegador se combina con la cuenta.

## Desplegar en otra cuenta desde cero

1. Crear el repositorio en GitHub y el proyecto en Vercel importándolo (framework Next.js; `vercel.json` aporta los
   comandos y la región).
2. Crear un proyecto de Supabase, ejecutar el SQL de arriba y cargar las variables.
3. Desplegar: la primera build aplica todas las migraciones.
