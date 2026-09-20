import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { prisma } from "@/common/lib/db";
import { env } from "@/common/lib/env";
import { errorFields, initLogging, logger } from "@/common/lib/logging/logger";
import { closeAllSSEConnections } from "@/common/lib/sse.server";
import { APP_VERSION } from "@/common/lib/version";
import { recordSyncResult } from "@/features/sync/lib/status";
import { syncDecisions } from "@/features/sync/lib/sync";

declare global {
	// Survive Vite SSR module reloads in dev so only one poller and one set of
	// signal handlers ever exist
	var __serverBooted: boolean | undefined;
	var __shutdownHooked: boolean | undefined;
}

const log = logger("server");

const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

const REPEAT_EVERY = 10;

let pollTimer: ReturnType<typeof setInterval> | undefined;
let syncInProgress = false;
let failures = 0;
let lastFailure = "";

async function poll() {
	if (syncInProgress) {
		log.warn("Skipping LAPI poll, previous sync still in progress");
		return;
	}
	syncInProgress = true;
	try {
		await syncDecisions();
		recordSyncResult(null);
		if (failures > 0) {
			log.info("LAPI sync recovered after {failures} failed polls", {
				failures,
			});
		}
		failures = 0;
	} catch (err) {
		recordSyncResult(err);
		failures++;
		const fields = { ...errorFields(err), failures };
		// A LAPI that stays down would otherwise repeat the same line every poll
		const isNews = failures === 1 || fields.errorMessage !== lastFailure;
		const reminder = failures % REPEAT_EVERY === 0;
		if (isNews || reminder) {
			log.error("LAPI sync failed: {errorMessage}", fields);
		} else {
			log.debug("LAPI sync still failing: {errorMessage}", fields);
		}
		lastFailure = fields.errorMessage;
	} finally {
		syncInProgress = false;
	}
}

function startDecisionPolling() {
	if (!env.LAPI_URL || !env.LAPI_BOUNCER_API_TOKEN) {
		log.warn(
			"LAPI_URL or LAPI_BOUNCER_API_TOKEN not set, decision polling is off",
		);
		return;
	}
	log.info("Polling {url} every {intervalSec}s", {
		url: env.LAPI_URL,
		intervalSec: env.LAPI_POLL_INTERVAL,
	});
	// First sync right away without blocking startup
	setImmediate(poll);
	pollTimer = setInterval(poll, env.LAPI_POLL_INTERVAL * 1000);
}

async function boot() {
	initLogging({ level: env.LOG_LEVEL, format: env.LOG_FORMAT });
	const startedAt = performance.now();
	log.info("CrowdSec Local Dashboard {version} starting", {
		version: APP_VERSION,
	});
	await prisma.$queryRaw`SELECT 1`;
	log.info("Database reachable", { url: env.DATABASE_URL });
	startDecisionPolling();
	if (env.OIDC_ISSUER_URL) {
		log.info("SSO enabled", { issuer: env.OIDC_ISSUER_URL });
	}
	if (!env.UPDATE_CHECK) {
		log.info("Update check off");
	}
	log.info("Ready in {durationMs}ms", {
		durationMs: Math.round(performance.now() - startedAt),
	});
}

// The HTTP server itself is closed by the runtime's own SIGTERM handler; this
// releases everything that would otherwise keep the process alive after that.
function hookShutdown() {
	let shuttingDown = false;
	for (const signal of SHUTDOWN_SIGNALS) {
		process.on(signal, async () => {
			if (shuttingDown) return;
			shuttingDown = true;
			log.info("Received {signal}, shutting down", { signal });
			clearInterval(pollTimer);
			closeAllSSEConnections();
			try {
				await prisma.$disconnect();
				log.info("Database closed");
			} catch (err) {
				log.error("Database close failed: {errorMessage}", errorFields(err));
			}
		});
	}
}

if (!globalThis.__shutdownHooked) {
	globalThis.__shutdownHooked = true;
	hookShutdown();
}
if (!globalThis.__serverBooted) {
	globalThis.__serverBooted = true;
	try {
		await boot();
	} catch (err) {
		globalThis.__serverBooted = false;
		log.fatal("Boot failed: {errorMessage}", errorFields(err));
		throw err;
	}
}

export default createServerEntry({
	fetch(request) {
		return handler.fetch(request);
	},
});
