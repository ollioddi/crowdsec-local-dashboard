-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scenario" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "hostIp" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Alert_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
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
    "alertId" INTEGER,
    CONSTRAINT "Decision_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Decision_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Decision" ("active", "createdAt", "duration", "expiresAt", "hostIp", "id", "origin", "scenario", "type") SELECT "active", "createdAt", "duration", "expiresAt", "hostIp", "id", "origin", "scenario", "type" FROM "Decision";
DROP TABLE "Decision";
ALTER TABLE "new_Decision" RENAME TO "Decision";
CREATE INDEX "Decision_hostIp_idx" ON "Decision"("hostIp");
CREATE INDEX "Decision_active_idx" ON "Decision"("active");
CREATE INDEX "Decision_expiresAt_idx" ON "Decision"("expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
