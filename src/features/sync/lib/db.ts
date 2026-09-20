import { extractAlertData } from "@/common/alert-types/alert-types";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/common/crowdsec-lapi/types";
import { prisma } from "@/common/lib/db";
import { logger } from "@/common/lib/logging/logger";
import { computeExpiresAt, lookupCountry } from "./transform";

const log = logger("lapi-sync");

export const BATCH_SIZE = 500;

function chunks<T>(items: T[]): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		out.push(items.slice(i, i + BATCH_SIZE));
	}
	return out;
}

/** Newest alert creation time for a decision, or null when it has no linked alerts. */
function latestAlertTime(alerts: CrowdSecAlert[]): Date | null {
	let latest: Date | null = null;
	for (const alert of alerts) {
		const t = new Date(alert.created_at);
		if (!Number.isNaN(t.getTime()) && (!latest || t > latest)) latest = t;
	}
	return latest;
}

/** Returns the subset of `ids` already present in the DB. */
export async function findExistingDecisionIds(
	ids: number[],
): Promise<Set<number>> {
	const existing = new Set<number>();
	for (const batch of chunks(ids)) {
		const rows = await prisma.decision.findMany({
			where: { id: { in: batch } },
			select: { id: true },
		});
		for (const row of rows) existing.add(row.id);
	}
	return existing;
}

/** Recalculates totalBans for the given hosts with one grouped query per batch. */
export async function updateHostBanCounts(ips: string[]): Promise<void> {
	for (const batch of chunks([...new Set(ips)])) {
		const grouped = await prisma.decision.groupBy({
			by: ["hostIp"],
			where: { hostIp: { in: batch } },
			_count: { _all: true },
		});
		const counts = new Map(grouped.map((g) => [g.hostIp, g._count._all]));
		await prisma.$transaction(
			batch.map((ip) =>
				prisma.host.updateMany({
					where: { ip },
					data: { totalBans: counts.get(ip) ?? 0 },
				}),
			),
		);
	}
}

/**
 * Upserts host records enriched with GeoIP data from the alert source (preferred)
 * or a GeoIP lookup fallback.
 *
 * GeoIP fields are only overwritten when the incoming value is non-null.
 * `lastSeen` only moves forward for decisions the DB has not seen before, so a
 * restart (which replays every active decision) does not rewrite it.
 */
export async function findKnownHostIps(ips: string[]): Promise<Set<string>> {
	const hosts = await prisma.host.findMany({
		where: { ip: { in: ips } },
		select: { ip: true },
	});
	return new Set(hosts.map((h) => h.ip));
}

export async function upsertHosts(
	decisions: CrowdSecDecision[],
	decisionToAlerts: Map<number, CrowdSecAlert[]>,
	newDecisionIds: Set<number>,
): Promise<void> {
	const now = new Date();
	for (const batch of chunks(decisions)) {
		await prisma.$transaction(
			batch.map((d) => {
				const alerts = decisionToAlerts.get(d.id) ?? [];
				const src = alerts[0]?.source;
				const country = src?.cn ?? lookupCountry(d.value);
				const seenAt = latestAlertTime(alerts) ?? now;

				return prisma.host.upsert({
					where: { ip: d.value },
					create: {
						ip: d.value,
						scope: d.scope,
						country,
						asNumber: src?.as_number ?? null,
						asName: src?.as_name ?? null,
						latitude: src?.latitude ?? null,
						longitude: src?.longitude ?? null,
						firstSeen: seenAt,
						lastSeen: seenAt,
						totalBans: 0, // corrected by updateHostBanCounts
					},
					update: {
						scope: d.scope,
						...(newDecisionIds.has(d.id) && { lastSeen: seenAt }),
						...(country != null && { country }),
						...(src?.as_number != null && { asNumber: src.as_number }),
						...(src?.as_name != null && { asName: src.as_name }),
						...(src?.latitude != null && { latitude: src.latitude }),
						...(src?.longitude != null && { longitude: src.longitude }),
					},
				});
			}),
		);
	}
}

/**
 * Creates host stubs for decisions that are being removed, in case those
 * hosts were never seen. Existing hosts are left untouched.
 */
export async function ensureHostsExist(
	decisions: CrowdSecDecision[],
): Promise<void> {
	const now = new Date();
	for (const batch of chunks(decisions)) {
		await prisma.$transaction(
			batch.map((d) =>
				prisma.host.upsert({
					where: { ip: d.value },
					create: {
						ip: d.value,
						scope: d.scope,
						country: lookupCountry(d.value),
						firstSeen: now,
						lastSeen: now,
						totalBans: 0, // corrected by updateHostBanCounts
					},
					update: {},
				}),
			),
		);
	}
}

/** Parses a LAPI timestamp, or null when missing or malformed. */
function toDate(value: string | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Applied on update too, so older rows pick these up when re-synced. */
function toDbExtract(alert: CrowdSecAlert) {
	const { entries, entryType } = extractAlertData(alert);
	return {
		entries: JSON.stringify(entries),
		entryType,
		startAt: toDate(alert.start_at),
		stopAt: toDate(alert.stop_at),
		eventsCount: alert.events_count ?? null,
	};
}

/**
 * Upserts alert records for the given batch of decisions.
 * Must run before upsertActiveDecisions to satisfy the join table FK.
 */
export async function upsertAlerts(
	batch: CrowdSecDecision[],
	decisionToAlerts: Map<number, CrowdSecAlert[]>,
): Promise<void> {
	const uniqueAlerts = new Map<number, CrowdSecAlert>();
	for (const d of batch) {
		for (const alert of decisionToAlerts.get(d.id) ?? []) {
			uniqueAlerts.set(alert.id, alert);
		}
	}
	if (uniqueAlerts.size === 0) return;

	await prisma.$transaction(
		Array.from(uniqueAlerts.values()).map((alert) =>
			prisma.alert.upsert({
				where: { id: alert.id },
				create: {
					id: alert.id,
					scenario: alert.scenario,
					message: alert.message,
					createdAt: new Date(alert.created_at),
					hostIp: alert.source.value,
					...toDbExtract(alert),
					events: JSON.stringify(alert.events ?? []),
				},
				update: toDbExtract(alert),
			}),
		),
	);
}

/**
 * Upserts decisions as active, linking each to its parent alerts where available.
 * `createdAt` is taken from the newest linked alert so a restart after downtime
 * does not stamp old decisions with the current time.
 */
export async function upsertActiveDecisions(
	decisions: CrowdSecDecision[],
	decisionToAlerts: Map<number, CrowdSecAlert[]>,
): Promise<void> {
	for (const batch of chunks(decisions)) {
		await upsertAlerts(batch, decisionToAlerts);

		await prisma.$transaction(
			batch.map((d) => {
				const alertsForDecision = decisionToAlerts.get(d.id) ?? [];
				const alertConnect = alertsForDecision.map((a) => ({ id: a.id }));

				return prisma.decision.upsert({
					where: { id: d.id },
					create: {
						id: d.id,
						hostIp: d.value,
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						duration: d.duration,
						scope: d.scope,
						simulated: d.simulated ?? false,
						createdAt: latestAlertTime(alertsForDecision) ?? undefined,
						expiresAt: computeExpiresAt(d),
						active: true,
						alerts: { connect: alertConnect },
					},
					update: {
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						scope: d.scope,
						simulated: d.simulated ?? false,
						active: true,
						...(alertConnect.length > 0 && {
							alerts: { connect: alertConnect },
						}),
					},
				});
			}),
		);
	}
}

/** Upserts decisions as inactive (expired or deleted from LAPI). */
export async function upsertInactiveDecisions(
	decisions: CrowdSecDecision[],
): Promise<void> {
	for (const batch of chunks(decisions)) {
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
						scope: d.scope,
						simulated: d.simulated ?? false,
						expiresAt: computeExpiresAt(d),
						active: false,
					},
					update: {
						active: false,
						scope: d.scope,
						simulated: d.simulated ?? false,
						// Negative remaining durations land in the past, which is correct
						expiresAt: computeExpiresAt(d),
					},
				}),
			),
		);
	}
}

/**
 * Marks active DB decisions absent from `activeIds` as inactive.
 * Used after a full (startup) pull. Returns the number deactivated.
 */
export async function deactivateStaleDecisions(
	activeIds: number[],
): Promise<number> {
	const where =
		activeIds.length > 0
			? { active: true, id: { notIn: activeIds } }
			: { active: true };
	const result = await prisma.decision.updateMany({
		where,
		data: { active: false },
	});
	return result.count;
}

/**
 * Safety net: deactivates decisions whose expiry has passed but that never
 * arrived in a `deleted` delta (missed pull, LAPI restart, shared bouncer key).
 */
export async function deactivateExpiredDecisions(): Promise<number> {
	const result = await prisma.decision.updateMany({
		where: { active: true, expiresAt: { lt: new Date() } },
		data: { active: false },
	});
	return result.count;
}

/** Deletes alerts and hosts that nothing references any more. */
async function pruneOrphans(): Promise<{ alerts: number; hosts: number }> {
	const { count: alerts } = await prisma.alert.deleteMany({
		where: { decisions: { none: {} } },
	});
	const { count: hosts } = await prisma.host.deleteMany({
		where: { decisions: { none: {} }, alerts: { none: {} } },
	});
	return { alerts, hosts };
}

/** Deletes the given decisions in batches and returns their host IPs. */
async function deleteDecisions(
	rows: Array<{ id: number; hostIp: string }>,
): Promise<string[]> {
	for (const batch of chunks(rows.map((row) => row.id))) {
		await prisma.decision.deleteMany({ where: { id: { in: batch } } });
	}
	return rows.map((row) => row.hostIp);
}

/**
 * Prunes inactive decisions older than `maxAgeDays`, then trims what is left
 * down to `retentionLimit`, then removes anything orphaned by that.
 *
 * Both limits are optional (0 disables). Age runs first and commits before
 * the count pass, so the second query needs no `notIn` list, which would
 * exceed SQLite's parameter limit at large retention values.
 *
 * Returns the host IPs whose decisions were pruned so counts can be refreshed.
 */
export async function pruneOldDecisions(
	retentionLimit: number,
	maxAgeDays = 0,
): Promise<string[]> {
	const prunedIps: string[] = [];
	let agedCount = 0;

	if (maxAgeDays > 0) {
		const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000);
		const aged = await prisma.decision.findMany({
			where: { active: false, createdAt: { lt: cutoff } },
			select: { id: true, hostIp: true },
		});
		agedCount = aged.length;
		prunedIps.push(...(await deleteDecisions(aged)));
	}

	let excessCount = 0;
	if (retentionLimit > 0) {
		const totalCount = await prisma.decision.count();
		const excess = totalCount - retentionLimit;
		if (excess > 0) {
			const oldest = await prisma.decision.findMany({
				where: { active: false },
				orderBy: { createdAt: "asc" },
				take: excess,
				select: { id: true, hostIp: true },
			});
			excessCount = oldest.length;
			prunedIps.push(...(await deleteDecisions(oldest)));
		}
	}

	if (prunedIps.length === 0) return [];

	const orphans = await pruneOrphans();

	log.info("Pruned {decisions} decisions, {alerts} alerts, {hosts} hosts", {
		decisions: agedCount + excessCount,
		aged: agedCount,
		overLimit: excessCount,
		alerts: orphans.alerts,
		hosts: orphans.hosts,
		retentionLimit,
		maxAgeDays,
	});

	return [...new Set(prunedIps)];
}

/**
 * Re-derives entries/entryType from stored events, for alerts written before
 * extraction existed. Those never refresh once their decision goes inactive.
 * Firewall alerts recover their type but not ports: dst_port was never stored.
 */
export async function repairAlertExtracts(): Promise<number> {
	const candidates = await prisma.alert.findMany({
		where: { entryType: "none", NOT: { events: "[]" } },
		select: { id: true, events: true },
	});
	if (candidates.length === 0) return 0;

	let repaired = 0;
	for (const batch of chunks(candidates)) {
		const updates = [];
		for (const row of batch) {
			let events: CrowdSecAlert["events"];
			try {
				events = JSON.parse(row.events);
			} catch {
				continue;
			}
			if (!events?.length) continue;

			// meta is empty: alert-level meta was never persisted, so firewall
			// alerts recover their type but not their ports
			const { entries, entryType } = extractAlertData({ events, meta: [] });
			if (entryType === "none") continue;

			updates.push(
				prisma.alert.update({
					where: { id: row.id },
					data: { entries: JSON.stringify(entries), entryType },
				}),
			);
		}
		if (updates.length > 0) {
			await prisma.$transaction(updates);
			repaired += updates.length;
		}
	}

	if (repaired > 0) {
		log.info("Recovered entries for {repaired} of {candidates} blank alerts", {
			repaired,
			candidates: candidates.length,
		});
	}
	return repaired;
}
