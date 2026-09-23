import { z } from "zod";
import type { CrowdSecAlert } from "@/common/crowdsec-lapi/types";
import { toDateOrNull } from "@/common/lib/dates";
import { logger } from "@/common/lib/logging/logger";
import { metaToRecord, recordToMeta } from "@/common/parsing/meta";
import { parseAlert, type RawAlert } from "@/common/parsing/registry";
import type { Alert } from "@/generated/prisma/client";

const log = logger("lapi-sync");

const storedEvents = z.array(
	z.object({
		timestamp: z.string().optional(),
		meta: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
	}),
);
const storedMeta = z.record(z.string(), z.string());

/**
 * Everything derived from an alert envelope, minus the identity columns: the
 * stored shape of an alert.
 *
 * `events` and `meta` keep LAPI's raw bags as JSON so the parsers can re-run
 * over them at read time (`decodeAlertRow`). Applied on update too, so rows
 * written by an older parser pick up new fields the next time their decision
 * is re-synced.
 */
export function encodeAlertRow(alert: CrowdSecAlert) {
	const parsed = parseAlert(alert);
	return {
		scenario: alert.scenario,
		message: alert.message,
		entries: JSON.stringify(parsed.entries),
		entryType: parsed.entryType,
		integration: parsed.integration,
		startAt: toDateOrNull(alert.start_at),
		stopAt: toDateOrNull(alert.stop_at),
		eventsCount: alert.events_count ?? null,
		// Provenance is copied, not parsed: the parsers only see the meta bags
		machineId: alert.machine_id ?? null,
		uuid: alert.uuid ?? null,
		scenarioVersion: alert.scenario_version ?? null,
		capacity: alert.capacity ?? null,
		// LAPI sends "" rather than omitting it when the bucket has no leak rate
		leakspeed: alert.leakspeed || null,
		simulated: alert.simulated ?? false,
		remediation: alert.remediation ?? null,
		sourceScope: alert.source?.scope ?? null,
		sourceRange: alert.source?.range ?? null,
		events: JSON.stringify(alert.events ?? []),
		meta: JSON.stringify(metaToRecord(alert.meta)),
	};
}

/**
 * The raw bags of a stored row, ready for `parseAlert`, or null when the JSON
 * is unreadable. A row that fails here is logged and left alone rather than
 * crashing a whole batch.
 */
export function decodeAlertRow(
	row: Pick<Alert, "id" | "events" | "meta">,
): RawAlert | null {
	try {
		return {
			events: storedEvents.parse(JSON.parse(row.events)),
			meta: recordToMeta(storedMeta.parse(JSON.parse(row.meta))),
		};
	} catch (error) {
		log.warn("Alert {id} has unreadable stored events or meta", {
			id: row.id,
			error: String(error),
		});
		return null;
	}
}
