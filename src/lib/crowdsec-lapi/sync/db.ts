import { prisma } from "@/db";
import { extractAlertData } from "@/lib/alert-types";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/lib/crowdsec-lapi/types";
import { computeExpiresAt, lookupCountry } from "./transform";

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

function toDbExtract(alert: CrowdSecAlert) {
	const { entries, entryType } = extractAlertData(alert);
	return { entries: JSON.stringify(entries), entryType };
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
						createdAt: latestAlertTime(alertsForDecision) ?? undefined,
						expiresAt: computeExpiresAt(d),
						active: true,
						alerts: { connect: alertConnect },
					},
					update: {
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
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
						expiresAt: computeExpiresAt(d),
						active: false,
					},
					update: {
						active: false,
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

/**
 * Prunes the oldest inactive decisions so the table stays at or below
 * `retentionLimit`, then removes alerts and hosts nothing references anymore.
 * Returns the host IPs whose decisions were pruned so counts can be refreshed.
 */
export async function pruneOldDecisions(
	retentionLimit: number,
): Promise<string[]> {
	const totalCount = await prisma.decision.count();
	if (totalCount <= retentionLimit) return [];

	const toPrune = await prisma.decision.findMany({
		where: { active: false },
		orderBy: { createdAt: "asc" },
		take: totalCount - retentionLimit,
		select: { id: true, hostIp: true },
	});
	if (toPrune.length === 0) return [];

	await prisma.decision.deleteMany({
		where: { id: { in: toPrune.map((d) => d.id) } },
	});
	const { count: prunedAlerts } = await prisma.alert.deleteMany({
		where: { decisions: { none: {} } },
	});
	const { count: prunedHosts } = await prisma.host.deleteMany({
		where: { decisions: { none: {} }, alerts: { none: {} } },
	});

	console.log(
		`[lapi-sync] Pruned ${toPrune.length} decisions, ${prunedAlerts} alerts, ${prunedHosts} hosts (retention limit: ${retentionLimit})`,
	);

	return [...new Set(toPrune.map((d) => d.hostIp))];
}
