import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "@/common/lib/env";
import { PrismaClient } from "@/generated/prisma/client.js";

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

const CONNECTION_PRAGMAS = [
	"synchronous = NORMAL",
	"temp_store = MEMORY",
	// Re-analyzes any table whose statistics have gone stale
	"optimize = 0x10002",
];

/** Tunes the connection for one long-lived process. Returns the journal mode. */
export async function configureDatabase(): Promise<string> {
	const [{ journal_mode }] = await prisma.$queryRawUnsafe<
		Array<{ journal_mode: string }>
	>("PRAGMA journal_mode = WAL");
	for (const pragma of CONNECTION_PRAGMAS) {
		await prisma.$executeRawUnsafe(`PRAGMA ${pragma}`);
	}
	return journal_mode;
}

/** Refreshes planner statistics after bulk deletes. */
export async function optimizeDatabase(): Promise<void> {
	await prisma.$executeRawUnsafe("PRAGMA optimize");
}
