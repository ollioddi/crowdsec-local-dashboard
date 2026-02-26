# ─── Stage 1: Install dependencies ─────────────────────────────────────────
# Uses prebuilt native binaries where available (better-sqlite3).
# Falls back to source compilation only if prebuilds aren't available.
FROM node:22-slim AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Install all dependencies (dev + prod) for the build stage.
# better-sqlite3 ships prebuilt binaries — no build tools needed.
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN DATABASE_URL=file:/tmp/build.db pnpm exec prisma generate
RUN pnpm run build
# Re-install without devDependencies for a lean production node_modules.
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────
FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Production node_modules (includes prebuilt better-sqlite3 binary)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
# Built server bundle + static assets
COPY --from=builder /app/.output ./.output
# Prisma schema + config - required by `prisma db push` at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

VOLUME /data
EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app.db

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node .output/server/index.mjs"]
