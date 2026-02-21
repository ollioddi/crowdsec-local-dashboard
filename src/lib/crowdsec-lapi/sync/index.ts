import { prisma } from "@/db";
import { env } from "@/env";
import { getLapiClient } from "@/lib/crowdsec-lapi";
import type { CrowdSecDecision } from "@/lib/crowdsec-lapi/types";
import { broadcastEvent } from "@/lib/sse.server";
import { buildDecisionToAlertMap } from "./alert-linker";
import {
	deactivateStaleDecisions,
	ensureHostsExist,
	pruneOldDecisions,
	updateHostBanCounts,
	upsertActiveDecisions,
	upsertHosts,
	upsertInactiveDecisions,
} from "./db";

/**
 * True only on the first poll per process lifetime. Forces a startup=true
 * request so LAPI sends the complete active set rather than a delta.
 */
let isFirstFetch = true;

/**
 * Upserts hosts, alerts, and active decisions for a set of new decisions.
 * Alert linking is attempted first so DB foreign keys are always satisfied.
 */
async function addNewDecisions(decisions: CrowdSecDecision[]): Promise<void> {
	const client = getLapiClient();
	const decisionToAlert = await buildDecisionToAlertMap(decisions, client);
	await upsertHosts(decisions, decisionToAlert);
	await upsertActiveDecisions(decisions, decisionToAlert);
	await updateHostBanCounts([...new Set(decisions.map((d) => d.value))]);
}

/**
 * Ensures host records exist then marks the given decisions as inactive.
 */
async function removeDeletedDecisions(
	decisions: CrowdSecDecision[],
): Promise<void> {
	await ensureHostsExist(decisions);
	await upsertInactiveDecisions(decisions);
	await updateHostBanCounts([...new Set(decisions.map((d) => d.value))]);
}

/** Fetches the current active decision + host state and broadcasts it to SSE clients. */
async function broadcastCurrentState(): Promise<void> {
	const activeDecisionsRaw = await prisma.decision.findMany({
		where: { active: true },
		include: {
			host: true,
			alerts: { select: { id: true, paths: true, scenario: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	const activeDecisions = activeDecisionsRaw.map((d) => ({
		...d,
		alerts: d.alerts.map((a) => ({
			id: a.id,
			scenario: a.scenario,
			paths: JSON.parse(a.paths) as string[],
		})),
	}));
	broadcastEvent("decisions", activeDecisions);

	const allHosts = await prisma.host.findMany({
		orderBy: { lastSeen: "desc" },
		include: {
			_count: {
				select: { decisions: { where: { active: true } } },
			},
		},
	});
	broadcastEvent("hosts", allHosts);

	console.log(
		`[lapi-sync] Sync complete — ${activeDecisions.length} active decisions, ${allHosts.length} hosts`,
	);
}

/**
 * Syncs decisions from LAPI using the stream endpoint.
 *
 * The first call per process lifetime (or when `forceFullSync` is true) uses
 * `startup=true` so LAPI returns the complete active set. Subsequent calls
 * receive only the delta (new + deleted) since the last poll.
 */
export async function syncDecisions(options?: {
	forceFullSync?: boolean;
}): Promise<void> {
	const useStartup = isFirstFetch || options?.forceFullSync === true;

	console.log(
		`[lapi-sync] Starting sync (startup=${useStartup}, isFirstFetch=${isFirstFetch}, forceFullSync=${options?.forceFullSync ?? false})`,
	);

	const client = getLapiClient();
	const stream = await client.getDecisionStream({
		startup: useStartup,
		origins: "crowdsec,cscli",
	});

	const newDecisions = stream.new ?? [];
	const deletedDecisions = stream.deleted ?? [];

	console.log(
		`[lapi-sync] Stream: ${newDecisions.length} new, ${deletedDecisions.length} deleted`,
	);

	if (newDecisions.length > 0) {
		console.log(`[lapi-sync] Processing ${newDecisions.length} new decisions`);
		await addNewDecisions(newDecisions);
	}

	if (deletedDecisions.length > 0) {
		console.log(
			`[lapi-sync] Processing ${deletedDecisions.length} deleted decisions`,
		);
		await removeDeletedDecisions(deletedDecisions);
	}

	// On a full (startup) fetch, deactivate any DB decisions absent from LAPI's response
	if (useStartup) {
		const staleCount = await deactivateStaleDecisions(
			newDecisions.map((d) => d.id),
		);
		if (staleCount > 0) {
			console.log(
				`[lapi-sync] Marked ${staleCount} stale DB decisions as inactive`,
			);
		}
	}

	isFirstFetch = false;

	// Prune old inactive decisions if we exceed the retention threshold
	if (env.DECISION_RETENTION_COUNT != null) {
		const prunedIps = await pruneOldDecisions(env.DECISION_RETENTION_COUNT);
		if (prunedIps.length > 0) {
			await updateHostBanCounts(prunedIps);
		}
	}

	await broadcastCurrentState();
}
