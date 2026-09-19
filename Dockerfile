# syntax=docker/dockerfile:1

# Pinned by digest so a build is reproducible; Dependabot bumps the pin.
ARG NODE_IMAGE=node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

# ─── Base: Node + pnpm ─────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
RUN apk upgrade --no-cache
# PNPM_HOME is where pnpm keeps its store, which the cache mounts below target
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ─── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
# prisma.config.ts reads DATABASE_URL at load time; generate never opens it
RUN DATABASE_URL=file:/tmp/build.db pnpm exec prisma generate
ARG APP_VERSION=dev
RUN VITE_APP_VERSION=$APP_VERSION pnpm run build

# ─── Production dependencies ───────────────────────────────────────────────
# A fresh install rather than a prune of the build tree, so nothing dev-only
# can survive into the runtime image.
#
# The Prisma CLI is only here for `migrate deploy`. `prisma version` makes it
# fetch its schema engine now, so the runtime needs neither network access nor
# a writable node_modules. The rest of what it drags in is deleted in the same
# layer: query compilers for the databases this app does not use, Studio, the
# TypeScript compiler it lists as a peer, and @prisma/client itself, which the
# server loads from the copy Nitro placed inside .output.
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod && \
    pnpm exec prisma version && \
    find node_modules -type f \( \
        -name 'query_compiler*_bg.mysql.*' -o \
        -name 'query_compiler*_bg.postgresql.*' -o \
        -name 'query_compiler*_bg.sqlserver.*' -o \
        -name 'query_compiler*_bg.cockroachdb.*' -o \
        -path '*/prisma/build/studio.js' \
    \) -delete && \
    rm -rf node_modules/.pnpm/@prisma+client@* \
           node_modules/.pnpm/typescript@* \
           node_modules/.pnpm/@typescript+typescript-* && \
    find node_modules -type l ! -exec test -e {} \; -delete

# ─── Runtime ───────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
# dumb-init forwards signals and reaps zombies as PID 1. npm, corepack and
# yarn are never used at runtime.
RUN apk upgrade --no-cache && apk add --no-cache dumb-init \
    && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
       /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn*

ENV NODE_ENV=production \
    DATABASE_URL=file:/data/app.db \
    PORT=3000 \
    CHECKPOINT_DISABLE=1
WORKDIR /app

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.output ./.output
COPY --chown=node:node --from=builder /app/prisma/schema.prisma ./prisma/
COPY --chown=node:node --from=builder /app/prisma/migrations ./prisma/migrations
COPY --chown=node:node --from=builder /app/package.json /app/prisma.config.ts ./
COPY --chown=node:node --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# A fresh named volume copies this ownership, so /data is writable by node
RUN mkdir -p /data && chown node:node /data
VOLUME /data

ARG APP_VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$GIT_SHA

EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
