# Imagen de desarrollo: todo el toolchain (Node + pnpm) vive en el contenedor, no en el host.
FROM node:26.13.1-bookworm-slim

# Node >= 25 ya no incluye corepack, por eso pnpm se instala explícitamente con versión fija.
RUN npm install -g pnpm@12.21.0 && npm cache clean --force

ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_store_dir=/app/node_modules/.pnpm-store

WORKDIR /app
EXPOSE 3000
