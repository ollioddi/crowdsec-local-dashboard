import geoip from "geoip-country";
import { prisma } from "@/db";
import { env } from "@/env";
import { getLapiClient } from "@/lib/crowdsec-lapi";
import type { CrowdSecDecision } from "@/lib/crowdsec-lapi/types";
import { broadcastEvent } from "@/lib/sse.server";

function lookupCountry(ip: string): string | null {
	const result = geoip.lookup(ip);
	return result?.country ?? null;
}

/**
 * Parse a Go-style duration string (e.g. "3h59m43.191505609s") to milliseconds.
 * The bouncer API's `duration` field is the *remaining* time.
 */
const DURATION_HOURS_RE = /([\d.]+)h/;
const DURATION_MINUTES_RE = /([\d.]+)m(?!s)/;
const DURATION_SECONDS_RE = /([\d.]+)s/;

function parseDurationMs(duration: string): number {
	let ms = 0;
	const h = DURATION_HOURS_RE.exec(duration);
	const m = DURATION_MINUTES_RE.exec(duration);
	const s = DURATION_SECONDS_RE.exec(duration);
	if (h) ms += Number.parseFloat(h[1]) * 3_600_000;
	if (m) ms += Number.parseFloat(m[1]) * 60_000;
	if (s) ms += Number.parseFloat(s[1]) * 1_000;
	return ms;
}

function computeExpiresAt(d: CrowdSecDecision): Date {
	return d.until
		? new Date(d.until)
		: new Date(Date.now() + parseDurationMs(d.duration));
}

const BATCH_SIZE = 500;

/** Recalculates and persists the total decision count for each of the given host IPs. */
async function updateHostBanCounts(ips: string[]): Promise<void> {
	for (const ip of ips) {
		const count = await prisma.decision.count({ where: { hostIp: ip } });
		await prisma.host.update({ where: { ip }, data: { totalBans: count } });
	}
}

/**
 * Determine if we need a full fetch (startup=true).
 * We always do this on the first poll per app restart so LAPI
 * sends us the complete active set, regardless of what it
 * thinks it previously delivered to this bouncer token.
 */
let isFirstFetch = true;

/**
 * Upsert a batch of decisions (and their hosts) into the database.
 */
async function upsertDecisions(decisions: CrowdSecDecision[]): Promise<void> {
	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

		// Ensure host records exist — never overwrite firstSeen for existing hosts
		await prisma.$transaction(
			batch.map((d) =>
				prisma.host.upsert({
					where: { ip: d.value },
					create: {
						ip: d.value,
						scope: d.scope,
						country: lookupCountry(d.value),
						totalBans: 1,
					},
					update: {
						scope: d.scope,
						country: lookupCountry(d.value),
					},
				}),
			),
		);

		// Upsert decisions — only set createdAt/expiresAt on first insert
		await prisma.$transaction(
			batch.map((d) =>
				prisma.decision.upsert({
					where: { id: d.id },
					create: {
						id: d.id,
						hostIp: d.value,
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						duration: d.duration,
						expiresAt: computeExpiresAt(d),
						active: true,
					},
					update: {
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						active: true,
					},
				}),
			),
		);
	}

	// Update totalBans for affected hosts to reflect actual decision count
	await updateHostBanCounts([...new Set(decisions.map((d) => d.value))]);
}

/**
 * Store deleted decisions for history, then mark them inactive.
 * On a fresh DB these decisions won't exist yet, so we upsert them as inactive.
 */
async function removeDecisions(decisions: CrowdSecDecision[]): Promise<void> {
	if (decisions.length === 0) return;

	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

		// Ensure hosts exist for history — never overwrite firstSeen
		await prisma.$transaction(
			batch.map((d) =>
				prisma.host.upsert({
					where: { ip: d.value },
					create: {
						ip: d.value,
						scope: d.scope,
						country: lookupCountry(d.value),
						totalBans: 1,
					},
					update: {},
				}),
			),
		);

		// Upsert as inactive — preserves history even after DB reset
		await prisma.$transaction(
			batch.map((d) =>
				prisma.decision.upsert({
					where: { id: d.id },
					create: {
						id: d.id,
						hostIp: d.value,
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						duration: d.duration,
						expiresAt: computeExpiresAt(d),
						active: false,
					},
					update: { active: false },
				}),
			),
		);
	}

	// Update totalBans for affected hosts to reflect actual decision count
	await updateHostBanCounts([...new Set(decisions.map((d) => d.value))]);
}

/**
 * Syncs decisions from LAPI using the stream endpoint.
 *
 * First call uses startup=true to get the full state.
 * Subsequent calls get only deltas (new + deleted since last poll).
 *
 * @param options.forceFullSync - Force a startup=true fetch (e.g. after a manual delete)
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
		`[lapi-sync] Stream response: ${newDecisions.length} new, ${deletedDecisions.length} deleted`,
	);

	if (newDecisions.length > 0) {
		const upsertList = newDecisions.map((d) => `${d.id}(${d.value})`).join(", ");
		console.log(`[lapi-sync] Upserting ${newDecisions.length} decisions: [${upsertList}]`);
		await upsertDecisions(newDecisions);
	}

	if (deletedDecisions.length > 0) {
		const deleteList = deletedDecisions.map((d) => `${d.id}(${d.value})`).join(", ");
		console.log(`[lapi-sync] Removing ${deletedDecisions.length} decisions: [${deleteList}]`);
		await removeDecisions(deletedDecisions);
	}

	// On a full (startup) fetch, mark any DB decisions not in the LAPI set as inactive
	if (useStartup) {
		const activeIds = newDecisions.map((d) => d.id);
		const staleWhere =
			activeIds.length > 0
				? { active: true, id: { notIn: activeIds } }
				: { active: true };
		const stale = await prisma.decision.updateMany({
			where: staleWhere,
			data: { active: false },
		});
		if (stale.count > 0) {
			console.log(
				`[lapi-sync] Marked ${stale.count} stale DB decisions as inactive`,
			);
		}
	}

	isFirstFetch = false;

	// Prune old inactive decisions if we exceed the retention threshold.
	// We keep at least DECISION_RETENTION_COUNT total decisions (active ones are never pruned).
	const retentionLimit = env.DECISION_RETENTION_COUNT;
	if (retentionLimit != null) {
		const totalCount = await prisma.decision.count();
		if (totalCount > retentionLimit) {
			const excess = totalCount - retentionLimit;
			// Find the oldest inactive decisions to prune
			const toPrune = await prisma.decision.findMany({
				where: { active: false },
				orderBy: { createdAt: "asc" },
				take: excess,
				select: { id: true, hostIp: true },
			});
			if (toPrune.length > 0) {
				const pruneIds = toPrune.map((d) => d.id);
				await prisma.decision.deleteMany({ where: { id: { in: pruneIds } } });
				console.log(
					`[lapi-sync] Pruned ${toPrune.length} inactive decisions (retention limit: ${retentionLimit})`,
				);

				// Update totalBans for affected hosts
				await updateHostBanCounts([...new Set(toPrune.map((d) => d.hostIp))]);
			}
		}
	}

	// Broadcast to SSE clients
	const activeDecisions = await prisma.decision.findMany({
		where: { active: true },
		include: { host: true },
		orderBy: { createdAt: "desc" },
	});
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
