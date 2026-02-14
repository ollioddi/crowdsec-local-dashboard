/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'Ip',
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    "totalBans" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "asNumber" TEXT,
    "asName" TEXT,
    "latitude" REAL,
    "longitude" REAL
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hostIp" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Decision_hostIp_fkey" FOREIGN KEY ("hostIp") REFERENCES "Host" ("ip") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "username" TEXT,
    "displayUsername" TEXT
);
INSERT INTO "new_User" ("createdAt", "displayUsername", "id", "name", "updatedAt", "username") SELECT "createdAt", "displayUsername", "id", "name", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Host_ip_key" ON "Host"("ip");

-- CreateIndex
CREATE INDEX "Decision_hostIp_idx" ON "Decision"("hostIp");

-- CreateIndex
CREATE INDEX "Decision_active_idx" ON "Decision"("active");

-- CreateIndex
CREATE INDEX "Decision_expiresAt_idx" ON "Decision"("expiresAt");
