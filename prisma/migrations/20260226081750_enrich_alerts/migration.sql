/*
  Warnings:

  - You are about to drop the column `paths` on the `Alert` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scenario" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "entries" TEXT NOT NULL DEFAULT '[]',
    "hostIp" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Alert_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("createdAt", "events", "hostIp", "id", "message", "scenario") SELECT "createdAt", "events", "hostIp", "id", "message", "scenario" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
