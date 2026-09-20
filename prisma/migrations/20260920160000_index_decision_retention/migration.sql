-- Keeps the oldest-inactive-first retention query indexed at large row counts.
CREATE INDEX IF NOT EXISTS "Decision_active_createdAt_idx" ON "Decision"("active", "createdAt");
