import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "@/env";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({
	url: env.DATABASE_URL,
});

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
	globalThis.__prisma = prisma;
}
