-- Alert-level context LAPI has always sent and the sync discarded:
-- provenance (which agent, which bucket) and the aggregated meta that holds
-- ja4h, user_agent and dst_port. Not backfillable once rows age out.
ALTER TABLE "Alert" ADD COLUMN "integration" TEXT;
ALTER TABLE "Alert" ADD COLUMN "machineId" TEXT;
ALTER TABLE "Alert" ADD COLUMN "uuid" TEXT;
ALTER TABLE "Alert" ADD COLUMN "scenarioVersion" TEXT;
ALTER TABLE "Alert" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Alert" ADD COLUMN "leakspeed" TEXT;
ALTER TABLE "Alert" ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Alert" ADD COLUMN "remediation" BOOLEAN;
ALTER TABLE "Alert" ADD COLUMN "sourceScope" TEXT;
ALTER TABLE "Alert" ADD COLUMN "sourceRange" TEXT;
ALTER TABLE "Alert" ADD COLUMN "meta" TEXT NOT NULL DEFAULT '{}';

-- Alert had no index at all; every expanded row joins on hostIp.
CREATE INDEX "Alert_hostIp_idx" ON "Alert"("hostIp");

-- Decision.uuid is sent by LAPI >= 1.5.
ALTER TABLE "Decision" ADD COLUMN "uuid" TEXT;

-- No DDL for two other schema changes: SQLite stores Prisma enums as TEXT, so
-- widening Decision.origin from an enum to a string, and adding `rules` to
-- AlertEntryType, need no column change.
