-- Fields LAPI sends that the sync discarded. Not backfillable once rows age out.
ALTER TABLE "Decision" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'Ip';
ALTER TABLE "Decision" ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Alert" ADD COLUMN "startAt" DATETIME;
ALTER TABLE "Alert" ADD COLUMN "stopAt" DATETIME;
ALTER TABLE "Alert" ADD COLUMN "eventsCount" INTEGER;
