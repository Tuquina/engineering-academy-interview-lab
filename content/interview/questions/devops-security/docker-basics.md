---
id: iq.docker-basics
format: quick
question: "¿Qué es un contenedor y cómo escribirías un buen Dockerfile para Node.js?"
expectedPoints:
  - id: container
    point: "Un contenedor es un proceso aislado con namespaces y cgroups que comparte el kernel del host; una VM virtualiza el hardware y trae su propio kernel."
  - id: image
    point: "La imagen es un conjunto de capas inmutables; el contenedor es una instancia en ejecución de esa imagen."
  - id: layers
    point: "Ordena el Dockerfile para aprovechar la caché: copiar manifiestos e instalar dependencias antes de copiar el código."
  - id: multistage
    point: "Usa multi-stage build para que la imagen final tenga sólo lo necesario para ejecutar."
  - id: security
    point: "Ejecuta como usuario no root, no incluye secretos en la imagen y usa .dockerignore."
followUps:
  - "¿Por qué tu contenedor no recibe SIGTERM cuando arranca con npm start?"
  - "¿Cómo persistís datos de una base en Docker?"
commonMistakes:
  - "Copiar todo el proyecto antes de instalar dependencias e invalidar la caché en cada cambio."
  - "Guardar variables secretas en la imagen con ENV."
relatedLessons: []
relatedPatterns: []
---

Un **contenedor** es un proceso del sistema operativo aislado con **namespaces** (qué ve: procesos, red, filesystem) y
limitado con **cgroups** (cuánto usa: CPU, memoria). Comparte el kernel del host, por eso arranca en milisegundos; una
máquina virtual emula hardware y corre su propio kernel.

La **imagen** es una pila de capas de solo lectura; cada instrucción del Dockerfile crea una. Docker reutiliza una capa
si nada cambió en ella ni antes, así que el orden importa:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

- **Multi-stage**: la imagen final no lleva compiladores ni dependencias de desarrollo.
- **Usuario no root** y `.dockerignore` (sin `node_modules`, `.git` ni archivos `.env`).
- Secretos en tiempo de ejecución (variables del orquestador o un gestor), nunca en la imagen.
- `CMD ["node", …]` en forma exec: el proceso Node es PID 1 y recibe `SIGTERM` para cerrar ordenadamente; con
  `npm start` la señal puede no llegar.
- Los datos persistentes van en **volúmenes**; el contenedor debe poder destruirse sin perder nada.
