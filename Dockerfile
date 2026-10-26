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

# One-off job: applies the committed migrations with the same drizzle-kit command as `npm run db:migrate`.
# Runtime dependencies plus drizzle-kit and dotenv at their locked versions, not the whole dev toolchain.
FROM base AS migrate
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm install --no-save $(node -p "const p = require('./package-lock.json').packages; \
      ['drizzle-kit', 'dotenv'].map((n) => n + '@' + p['node_modules/' + n].version).join(' ')") \
 && npm cache clean --force
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
USER node
CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate"]

FROM base AS runner
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
