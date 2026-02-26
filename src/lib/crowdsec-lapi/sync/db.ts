import { prisma } from "@/db";
import { extractAlertData } from "@/lib/alert-types";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/lib/crowdsec-lapi/types";
import { computeExpiresAt, lookupCountry } from "./transform";

export const BATCH_SIZE = 500;

/** Recalculates and persists the total decision count for each of the given host IPs. */
export async function updateHostBanCounts(ips: string[]): Promise<void> {
	for (const ip of ips) {
		const count = await prisma.decision.count({ where: { hostIp: ip } });
		await prisma.host.update({ where: { ip }, data: { totalBans: count } });
	}
}

/**
 * Upserts host records enriched with GeoIP data from the alert source (preferred)
 * or a GeoIP lookup fallback.
 *
 * On create, all available fields are written.
 * On update, GeoIP fields are only overwritten when the incoming value is non-null —
 * existing enrichment is never replaced with null.
 */
export async function upsertHosts(
	decisions: CrowdSecDecision[],
	decisionToAlerts: Map<number, CrowdSecAlert[]>,
): Promise<void> {
	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

		await prisma.$transaction(
			batch.map((d) => {
				// Use the first alert that has source data for GeoIP enrichment
				const alerts = decisionToAlerts.get(d.id) ?? [];
				const src = alerts[0]?.source;
				const country = src?.cn ?? lookupCountry(d.value);

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
						totalBans: 0, // corrected by updateHostBanCounts after all decisions are written
					},
					update: {
						scope: d.scope,
						// Only overwrite GeoIP fields when we actually have new data so we
						// don't null-out enrichment that arrived via a previous sync.
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
 * Creates host stubs for decisions that are being removed (expired/deleted),
 * in case those hosts have never been seen before.
 * GeoIP enrichment is skipped here since these decisions are leaving; a future
 * sync will populate GeoIP if the host reappears.
 */
export async function ensureHostsExist(
	decisions: CrowdSecDecision[],
): Promise<void> {
	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

		await prisma.$transaction(
			batch.map((d) =>
				prisma.host.upsert({
					where: { ip: d.value },
					create: {
						ip: d.value,
						scope: d.scope,
						country: lookupCountry(d.value),
						totalBans: 0, // corrected by updateHostBanCounts after decisions are written
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
 * Alerts are immutable after creation so the update clause is empty.
 * Must be called before upsertActiveDecisions to satisfy the join table FK constraint.
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
 * Alerts for the batch are upserted first to satisfy the join table FK constraint.
 */
export async function upsertActiveDecisions(
	decisions: CrowdSecDecision[],
	decisionToAlerts: Map<number, CrowdSecAlert[]>,
): Promise<void> {
	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

		// Alerts must exist before decisions reference them via the join table
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
						expiresAt: computeExpiresAt(d),
						active: true,
						alerts: { connect: alertConnect },
					},
					update: {
						type: d.type,
						origin: d.origin,
						scenario: d.scenario,
						active: true,
						// Back-fill alerts if they were missing on a previous sync
						...(alertConnect.length > 0 && {
							alerts: { connect: alertConnect },
						}),
					},
				});
			}),
		);
	}
}

/**
 * Upserts decisions as inactive (expired or deleted from LAPI).
 * No alert linking is performed since these decisions are leaving.
 */
export async function upsertInactiveDecisions(
	decisions: CrowdSecDecision[],
): Promise<void> {
	for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
		const batch = decisions.slice(i, i + BATCH_SIZE);

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
						// Recalculate expiresAt from the deleted-stream duration so that
						// negative durations (already-expired decisions) correctly land in the past.
						expiresAt: computeExpiresAt(d),
					},
				}),
			),
		);
	}
}

/**
 * Marks all currently active DB decisions that are NOT in `activeIds` as inactive.
 * Used after a full (startup) sync to reconcile stale records.
 * Returns the number of decisions deactivated.
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
 * Prunes the oldest inactive decisions to keep the total count at or below
 * `retentionLimit`. Active decisions are never pruned.
 * Returns the distinct host IPs of pruned decisions so ban counts can be updated.
 */
export async function pruneOldDecisions(
	retentionLimit: number,
): Promise<string[]> {
	const totalCount = await prisma.decision.count();
	if (totalCount <= retentionLimit) return [];

	const excess = totalCount - retentionLimit;
	const toPrune = await prisma.decision.findMany({
		where: { active: false },
		orderBy: { createdAt: "asc" },
		take: excess,
		select: { id: true, hostIp: true },
	});
	if (toPrune.length === 0) return [];

	await prisma.decision.deleteMany({
		where: { id: { in: toPrune.map((d) => d.id) } },
	});

	// Clean up alerts that are no longer linked to any decision
	const { count: prunedAlerts } = await prisma.alert.deleteMany({
		where: { decisions: { none: {} } },
	});

	console.log(
		`[lapi-sync] Pruned ${toPrune.length} inactive decisions, ${prunedAlerts} orphaned alerts (retention limit: ${retentionLimit})`,
	);

	return [...new Set(toPrune.map((d) => d.hostIp))];
}
