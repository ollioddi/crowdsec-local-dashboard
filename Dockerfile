# ─── Stage 1: Base & Deps ──────────────────────────────────────────────────
FROM node:24-slim AS base
RUN corepack enable pnpm
# Install OpenSSL here so Prisma is happy during 'generate'
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Use a cache mount for pnpm to speed up re-builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL=file:/tmp/build.db pnpm exec prisma generate
RUN pnpm run build
# Prune dev dependencies in place to save space
RUN pnpm prune --prod

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────
FROM node:24-slim AS runner
# Re-install openssl for the runtime environment
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app.db

# Copy only what is strictly necessary
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

VOLUME /data
EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node .output/server/index.mjs"]