# Node 24.22.1 is the security release of 2026-10-21; keep the tag pinned and bump it on purpose.
FROM node:24.22.1-alpine3.24 AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# The image is built without secrets; the running server validates its environment instead.
ENV SKIP_ENV_VALIDATION=true \
    BUILD_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Node without npm, npx, corepack and yarn: the containers never install packages, and the npm bundled
# with the base image brings its own vulnerable dependencies into the scan.
FROM base AS slim
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

# One-off job: applies the committed migrations (scripts/migrate.ts). Its three packages have no
# dependencies of their own, so they are copied at their locked versions instead of installing anything.
FROM slim AS migrate
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps /app/node_modules/zod ./node_modules/zod
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/
USER node
CMD ["node", "scripts/migrate.ts"]

FROM slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
