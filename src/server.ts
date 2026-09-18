import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "@/env";
import { syncDecisions } from "@/lib/crowdsec-lapi/sync";

declare global {
	// Survives Vite SSR module reloads in dev so only one poller ever runs
	var __lapiPollStarted: boolean | undefined;
}

let syncInProgress = false;

async function startDecisionPolling() {
	if (globalThis.__lapiPollStarted) return;
	globalThis.__lapiPollStarted = true;

	if (!env.LAPI_URL || !env.LAPI_BOUNCER_API_TOKEN) {
		console.log(
			"[lapi-sync] LAPI_URL or LAPI_BOUNCER_API_TOKEN not set, skipping decision polling",
		);
		return;
	}

	const intervalSec = env.LAPI_POLL_INTERVAL;
	console.log(`[lapi-sync] Starting decision polling every ${intervalSec}s`);

	async function poll() {
		if (syncInProgress) {
			console.warn(
				"[lapi-sync] Skipping poll — previous sync still in progress",
			);
			return;
		}
		syncInProgress = true;
		try {
			await syncDecisions();
		} catch (err) {
			console.error("[lapi-sync] Sync failed:", err);
		} finally {
			syncInProgress = false;
		}
	}

	// Run first sync immediately without blocking server startup
	setImmediate(poll);
	setInterval(poll, intervalSec * 1000);
}

await startDecisionPolling();

export default createServerEntry({
	fetch(request) {
		return handler.fetch(request);
	},
});
