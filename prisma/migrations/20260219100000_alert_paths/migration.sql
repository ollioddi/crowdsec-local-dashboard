-- Replace topPath (single path) with paths (JSON array of all unique http_paths)
-- SQLite requires table recreation to change columns.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scenario" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "paths" TEXT NOT NULL DEFAULT '[]',
    "hostIp" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Alert_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("id", "scenario", "message", "createdAt", "hostIp", "events")
    SELECT "id", "scenario", "message", "createdAt", "hostIp", "events" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
