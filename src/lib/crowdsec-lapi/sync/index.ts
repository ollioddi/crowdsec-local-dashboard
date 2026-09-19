import { prisma } from "@/db";
import { env } from "@/env";
import { getLapiClient } from "@/lib/crowdsec-lapi";
import type { CrowdSecDecision } from "@/lib/crowdsec-lapi/types";
import { logger } from "@/lib/logging/logger";
import { broadcastEvent } from "@/lib/sse.server";
import { buildDecisionToAlertMap } from "./alert-linker";
import {
	deactivateExpiredDecisions,
	deactivateStaleDecisions,
	ensureHostsExist,
	findExistingDecisionIds,
	findKnownHostIps,
	pruneOldDecisions,
	updateHostBanCounts,
	upsertActiveDecisions,
	upsertHosts,
	upsertInactiveDecisions,
} from "./db";

const log = logger("lapi-sync");

/** First poll per process must be a full (startup=true) pull. */
let isFirstFetch = true;

/**
 * LAPI advances the bouncer's last-pull timestamp as soon as it answers the
 * stream request, so a failure after that point loses the delta for good.
 * Any failed sync therefore forces a full pull on the next attempt.
 */
let needsFullSync = false;

/** Returns how many of the decisions' hosts were seen for the first time. */
async function addNewDecisions(decisions: CrowdSecDecision[]): Promise<number> {
	const client = getLapiClient();
	const ips = [...new Set(decisions.map((d) => d.value))];
	const [decisionToAlert, existingIds, knownIps] = await Promise.all([
		buildDecisionToAlertMap(decisions, client),
		findExistingDecisionIds(decisions.map((d) => d.id)),
		findKnownHostIps(ips),
	]);
	const newIds = new Set(
		decisions.map((d) => d.id).filter((id) => !existingIds.has(id)),
	);
	await upsertHosts(decisions, decisionToAlert, newIds);
	await upsertActiveDecisions(decisions, decisionToAlert);
	await updateHostBanCounts(ips);
	return ips.length - knownIps.size;
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

	log.debug("Broadcast {decisions} active decisions and {hosts} hosts", {
		decisions: activeDecisions.length,
		hosts: allHosts.length,
	});
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

	log.debug(useStartup ? "Starting full sync" : "Starting delta sync");
	const startedAt = performance.now();

	try {
		const client = getLapiClient();
		const stream = await client.getDecisionStream({
			startup: useStartup,
			origins: "crowdsec,cscli",
		});

		const newDecisions = stream.new ?? [];
		const deletedDecisions = stream.deleted ?? [];
		let changed = false;
		let newHosts = 0;

		if (newDecisions.length > 0) {
			newHosts = await addNewDecisions(newDecisions);
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
				log.info("Deactivated {count} decisions no longer in LAPI", {
					count: staleCount,
				});
				changed = true;
			}
		}

		const expiredCount = await deactivateExpiredDecisions();
		if (expiredCount > 0) {
			log.info("Deactivated {count} decisions past their expiry", {
				count: expiredCount,
			});
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

		const durationMs = Math.round(performance.now() - startedAt);
		if (changed) {
			log.info(
				"Synced {newDecisions} new and {deletedDecisions} deleted decisions",
				{
					newDecisions: newDecisions.length,
					deletedDecisions: deletedDecisions.length,
					newHosts,
					full: useStartup,
					durationMs,
				},
			);
			await broadcastCurrentState();
		} else {
			log.debug("No changes", { full: useStartup, durationMs });
		}
	} catch (error) {
		needsFullSync = true;
		throw error;
	}
}
