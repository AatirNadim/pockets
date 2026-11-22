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
COPY server ./server
RUN pnpm --filter @pockets/shared build
RUN pnpm --filter pockets-signaling-server build
RUN pnpm install --prod --filter pockets-signaling-server... --frozen-lockfile

FROM node:20-alpine AS runner
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/server/node_modules ./server/node_modules
COPY --from=build --chown=node:node /workspace/server/package.json ./server/package.json
COPY --from=build --chown=node:node /workspace/server/dist ./server/dist
COPY --from=build --chown=node:node /workspace/shared ./shared
USER node
WORKDIR /app/server
EXPOSE 8080
CMD ["node", "dist/index.js"]
