#!/bin/sh
set -e

# ─── Resolve the actual SQLite file path ──────────────────────────────────
DB_PATH="${DATABASE_URL#file:}"

# ─── Detect migration state ───────────────────────────────────────────────
# Databases previously managed by `prisma db push` have no _prisma_migrations
# table, which causes P3005 when switching to `migrate deploy`.
# Possible states:
#   empty      - no DB file / no tables  → migrate deploy runs all migrations
#   managed    - _prisma_migrations exists → migrate deploy applies any pending
#   old-push   - tables exist, paths col present  → baseline pre-Feb-26 migrations
#   new-push   - tables exist, new schema already  → baseline all migrations
STATE=$(node - "$DB_PATH" <<'NODEEOF'
const dbPath = process.argv[1];
const fs = require('fs');

if (!fs.existsSync(dbPath)) { process.stdout.write('empty'); process.exit(0); }

const Database = require('better-sqlite3');
const db = new Database(dbPath, { readonly: true });
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all().map((r) => r.name);
db.close();

if (!tables.length) { process.stdout.write('empty'); process.exit(0); }
if (tables.includes('_prisma_migrations')) { process.stdout.write('managed'); process.exit(0); }

// DB has tables but no migration history — was managed by db push.
// The presence of the 'paths' column on Alert tells us whether we're on the
// old schema (migrations 1-8) or the new one (all 10 migrations applied).
const db2 = new Database(dbPath, { readonly: true });
const alertCols = tables.includes('Alert')
  ? db2.prepare('PRAGMA table_info("Alert")').all().map((r) => r.name)
  : [];
db2.close();
process.stdout.write(alertCols.includes('paths') ? 'old-push' : 'new-push');
NODEEOF
)

echo "[startup] DB state: ${STATE}"

if [ "$STATE" = "old-push" ]; then
  # The DB is at the pre-Feb-26 schema (has 'paths' column).
  # Baseline all migrations before 20260226 so that migrate deploy
  # applies only the two new ones that drop 'paths' and add 'entries'/'entryType'.
  echo "[startup] Baselining pre-existing migrations..."
  for m in $(ls prisma/migrations/ | grep -E '^[0-9]' | sort); do
    case "$m" in
      20260226*) break ;;
    esac
    echo "[startup]   -> ${m}"
    node_modules/.bin/prisma migrate resolve --applied "$m"
  done

elif [ "$STATE" = "new-push" ]; then
  # DB already has the new schema via a later db push; mark everything as
  # applied so migrate deploy exits cleanly with "no pending migrations".
  echo "[startup] Baselining all migrations (new schema already applied via db push)..."
  for m in $(ls prisma/migrations/ | grep -E '^[0-9]' | sort); do
    echo "[startup]   -> ${m}"
    node_modules/.bin/prisma migrate resolve --applied "$m"
  done
fi

echo "[startup] Running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy

exec node .output/server/index.mjs
