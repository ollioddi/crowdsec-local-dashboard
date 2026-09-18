import { prisma } from "@/db";
import { env } from "@/env";
import { getLapiClient } from "@/lib/crowdsec-lapi";
import type { CrowdSecDecision } from "@/lib/crowdsec-lapi/types";
import { broadcastEvent } from "@/lib/sse.server";
import { buildDecisionToAlertMap } from "./alert-linker";
import {
	deactivateExpiredDecisions,
	deactivateStaleDecisions,
	ensureHostsExist,
	findExistingDecisionIds,
	pruneOldDecisions,
	updateHostBanCounts,
	upsertActiveDecisions,
	upsertHosts,
	upsertInactiveDecisions,
} from "./db";

/** First poll per process must be a full (startup=true) pull. */
let isFirstFetch = true;

/**
 * LAPI advances the bouncer's last-pull timestamp as soon as it answers the
 * stream request, so a failure after that point loses the delta for good.
 * Any failed sync therefore forces a full pull on the next attempt.
 */
let needsFullSync = false;

async function addNewDecisions(decisions: CrowdSecDecision[]): Promise<void> {
	const client = getLapiClient();
	const [decisionToAlert, existingIds] = await Promise.all([
		buildDecisionToAlertMap(decisions, client),
		findExistingDecisionIds(decisions.map((d) => d.id)),
	]);
	const newIds = new Set(
		decisions.map((d) => d.id).filter((id) => !existingIds.has(id)),
	);
	await upsertHosts(decisions, decisionToAlert, newIds);
	await upsertActiveDecisions(decisions, decisionToAlert);
	await updateHostBanCounts(decisions.map((d) => d.value));
}

async function removeDeletedDecisions(
	decisions: CrowdSecDecision[],
): Promise<void> {
	await ensureHostsExist(decisions);
	await upsertInactiveDecisions(decisions);
	await updateHostBanCounts(decisions.map((d) => d.value));
}

/** Pushes the current active decisions and host list to SSE clients. */
export async function broadcastCurrentState(): Promise<void> {
	const activeDecisionsRaw = await prisma.decision.findMany({
		where: { active: true },
		include: {
			host: true,
			alerts: {
				select: { id: true, entries: true, entryType: true, scenario: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});
	const activeDecisions = activeDecisionsRaw.map((d) => ({
		...d,
		alerts: d.alerts.map((a) => ({
			id: a.id,
			scenario: a.scenario,
			entries: JSON.parse(a.entries) as string[],
			entryType: a.entryType,
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
		`[lapi-sync] Broadcast ${activeDecisions.length} active decisions, ${allHosts.length} hosts`,
	);
}

/**
 * Syncs decisions from the LAPI stream endpoint.
 *
 * The first call per process, any call after a failed sync, and calls with
 * `forceFullSync` use `startup=true` to receive the complete active set.
 * Other calls receive only the delta since the last poll.
 */
export async function syncDecisions(options?: {
	forceFullSync?: boolean;
}): Promise<void> {
	const useStartup =
		isFirstFetch || needsFullSync || options?.forceFullSync === true;

	console.log(`[lapi-sync] Starting sync (startup=${useStartup})`);

	try {
		const client = getLapiClient();
		const stream = await client.getDecisionStream({
			startup: useStartup,
			origins: "crowdsec,cscli",
		});

		const newDecisions = stream.new ?? [];
		const deletedDecisions = stream.deleted ?? [];
		let changed = false;

		console.log(
			`[lapi-sync] Stream: ${newDecisions.length} new, ${deletedDecisions.length} deleted`,
		);

		if (newDecisions.length > 0) {
			await addNewDecisions(newDecisions);
			changed = true;
		}

		if (deletedDecisions.length > 0) {
			await removeDeletedDecisions(deletedDecisions);
			changed = true;
		}

		if (useStartup) {
			const staleCount = await deactivateStaleDecisions(
				newDecisions.map((d) => d.id),
			);
			if (staleCount > 0) {
				console.log(`[lapi-sync] Deactivated ${staleCount} stale decisions`);
				changed = true;
			}
		}

		const expiredCount = await deactivateExpiredDecisions();
		if (expiredCount > 0) {
			console.log(
				`[lapi-sync] Deactivated ${expiredCount} decisions past their expiry`,
			);
			changed = true;
		}

		isFirstFetch = false;
		needsFullSync = false;

		if (env.DECISION_RETENTION_COUNT > 0) {
			const prunedIps = await pruneOldDecisions(env.DECISION_RETENTION_COUNT);
			if (prunedIps.length > 0) {
				await updateHostBanCounts(prunedIps);
				changed = true;
			}
		}

		if (changed) {
			await broadcastCurrentState();
		} else {
			console.log("[lapi-sync] No changes");
		}
	} catch (error) {
		needsFullSync = true;
		throw error;
	}
}
