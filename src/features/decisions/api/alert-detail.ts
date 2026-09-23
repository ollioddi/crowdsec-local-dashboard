import {
	type ParsedAlertEnvelope,
	parseAlert,
} from "@/common/parsing/registry";
import type { ParsedEvent } from "@/common/parsing/types";
import { decodeAlertRow } from "@/features/sync/lib/alert-row";
import type { Alert } from "@/generated/prisma/client";

/** Which agent saw the alert and the bucket that fired, straight off the row. */
export type AlertProvenance = Pick<
	Alert,
	| "machineId"
	| "uuid"
	| "scenarioVersion"
	| "capacity"
	| "leakspeed"
	| "simulated"
	| "remediation"
	| "sourceScope"
	| "sourceRange"
>;

/**
 * A parsed event with an identity the UI can key on. LAPI sends events
 * without ids and we store them as one JSON list, so "event n of alert X" is
 * the only stable identity there is; it is minted here, once.
 */
export type AlertDetailEvent = ParsedEvent & { id: string };

/** One alert as the expanded row renders it. */
export type AlertDetail = Omit<ParsedAlertEnvelope, "events"> & {
	id: number;
	scenario: string;
	message: string;
	createdAt: Date;
	startAt: Date | null;
	stopAt: Date | null;
	/** LAPI's count when it sent one; it can exceed the events it returned. */
	eventsCount: number;
	provenance: AlertProvenance;
	events: AlertDetailEvent[];
};

/**
 * A stored alert row → everything the expanded row shows.
 *
 * Re-parsed from the stored raw JSON rather than read from the precomputed
 * columns, so a parser improvement reaches rows already in the DB without a
 * re-sync. Provenance is the exception: it comes from columns, because the
 * envelope LAPI sent is not stored. A row whose JSON is unreadable renders as
 * an alert with no events, not as a crash.
 */
export function alertDetailFromRow(row: Alert): AlertDetail {
	const { events, ...envelope } = parseAlert(
		decodeAlertRow(row) ?? { events: [] },
	);
	return {
		...envelope,
		id: row.id,
		scenario: row.scenario,
		message: row.message,
		createdAt: row.createdAt,
		startAt: row.startAt,
		stopAt: row.stopAt,
		eventsCount: row.eventsCount ?? events.length,
		provenance: {
			machineId: row.machineId,
			uuid: row.uuid,
			scenarioVersion: row.scenarioVersion,
			capacity: row.capacity,
			leakspeed: row.leakspeed,
			simulated: row.simulated,
			remediation: row.remediation,
			sourceScope: row.sourceScope,
			sourceRange: row.sourceRange,
		},
		events: events.map((event, index) => ({
			id: `${row.id}-${index}`,
			...event,
		})),
	};
}
