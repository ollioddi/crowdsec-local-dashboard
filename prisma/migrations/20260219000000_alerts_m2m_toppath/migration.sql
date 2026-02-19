-- Create implicit M2M join table for Decision <-> Alert
CREATE TABLE "_DecisionAlerts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_DecisionAlerts_A_fkey" FOREIGN KEY ("A") REFERENCES "Alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DecisionAlerts_B_fkey" FOREIGN KEY ("B") REFERENCES "Decision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_DecisionAlerts_AB_unique" ON "_DecisionAlerts"("A", "B");
CREATE INDEX "_DecisionAlerts_B_index" ON "_DecisionAlerts"("B");

-- Migrate existing FK data from Decision.alertId into the join table
INSERT INTO "_DecisionAlerts" ("A", "B")
SELECT "alertId", "id" FROM "Decision" WHERE "alertId" IS NOT NULL;

-- Add topPath column to Alert
ALTER TABLE "Alert" ADD COLUMN "topPath" TEXT;

-- Recreate Decision table without alertId (SQLite requires full table recreation to drop columns)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Decision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hostIp" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Decision_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Decision" ("active", "createdAt", "duration", "expiresAt", "hostIp", "id", "origin", "scenario", "type")
    SELECT "active", "createdAt", "duration", "expiresAt", "hostIp", "id", "origin", "scenario", "type" FROM "Decision";
DROP TABLE "Decision";
ALTER TABLE "new_Decision" RENAME TO "Decision";
CREATE INDEX "Decision_hostIp_idx" ON "Decision"("hostIp");
CREATE INDEX "Decision_active_idx" ON "Decision"("active");
CREATE INDEX "Decision_expiresAt_idx" ON "Decision"("expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
