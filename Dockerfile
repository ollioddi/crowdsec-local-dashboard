# ─── Stage 1: Shared base ────────────────────────────────────────────────────
# Provides Node + pnpm + native build tools (needed for better-sqlite3).
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@latest
WORKDIR /app

# ─── Stage 2: Production dependencies ────────────────────────────────────────
# Installs only runtime deps so the final image doesn't carry devDependencies.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 3: Build ──────────────────────────────────────────────────────────
# Installs all deps, generates the Prisma client, and builds the app.
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Generate Prisma client into src/generated/prisma (bundled by Nitro).
# DATABASE_URL is not used by generate but prisma.config.ts calls env() at
# config-load time, so we provide a placeholder to satisfy the resolver.
RUN DATABASE_URL=file:/tmp/build.db pnpm exec prisma generate
# Produce the server bundle at .output/server/index.mjs
RUN pnpm run build

# ─── Stage 4: Runtime ────────────────────────────────────────────────────────
# Lean image: no build tools, no devDependencies, no source files.
FROM node:22-slim AS runner
WORKDIR /app

# Production node_modules (includes pre-compiled better-sqlite3 binary)
COPY --from=prod-deps /app/node_modules ./node_modules
# Built server bundle + static assets
COPY --from=builder /app/.output ./.output
# Prisma schema — required by `prisma db push` at startup
COPY --from=builder /app/prisma ./prisma

# SQLite database is stored here; mount a volume to persist it.
VOLUME /data

EXPOSE 3000

ENV NODE_ENV=production
# Override DATABASE_URL at runtime or in docker-compose to change the DB path.
ENV DATABASE_URL=file:/data/app.db

# On every start: apply any pending schema changes, then launch the server.
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate && node .output/server/index.mjs"]
