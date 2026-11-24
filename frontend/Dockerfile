FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /workspace

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile
COPY shared ./shared
COPY frontend ./frontend
COPY server ./server
ARG NEXT_PUBLIC_SERVER_PATH=localhost:8080
ENV NEXT_PUBLIC_SERVER_PATH=${NEXT_PUBLIC_SERVER_PATH}
RUN pnpm --filter @pockets/shared build
RUN pnpm --filter pockets-ui build
RUN pnpm install --prod --filter pockets-ui... --frozen-lockfile

FROM node:20-alpine AS runner
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/frontend/node_modules ./frontend/node_modules
COPY --from=build --chown=node:node /workspace/frontend/.next ./frontend/.next
COPY --from=build --chown=node:node /workspace/frontend/public ./frontend/public
COPY --from=build --chown=node:node /workspace/frontend/package.json ./frontend/package.json
COPY --from=build --chown=node:node /workspace/frontend/next.config.ts ./frontend/next.config.ts
COPY --from=build --chown=node:node /workspace/shared ./shared
USER node
WORKDIR /app/frontend
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
