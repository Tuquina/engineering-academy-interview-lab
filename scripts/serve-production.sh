#!/bin/sh
# Servidor de producción local (`docker compose up web`). Compila sólo si cambió algo desde el último build, así los
# arranques siguientes tardan segundos. Las páginas se sirven prerenderizadas: es el modo para usar la app a diario.
set -e
pnpm install --frozen-lockfile
pnpm db:migrate
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src content public drizzle scripts package.json pnpm-lock.yaml next.config.ts \
  -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Hay cambios desde el último build: compilando (unos minutos)…"
  pnpm build
else
  echo "Build al día: se reutiliza."
fi
exec pnpm start --hostname 0.0.0.0 --port 3000
