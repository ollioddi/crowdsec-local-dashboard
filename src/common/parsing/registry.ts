import { toDateOrNull } from "@/common/lib/dates";
import { extractFacets } from "./facets/extract-facets";
import { INTEGRATIONS } from "./integrations/integrations";
import { type MetaEntry, MetaView } from "./meta";
import type {
	AlertAggregates,
	AlertEntryType,
	AlertFacets,
	EventFields,
	Integration,
	IntegrationId,
	ParsedEvent,
} from "./types";

/** The raw event shape LAPI returns and the DB stores verbatim. */
export type RawEvent = {
	timestamp?: string;
	meta?: MetaEntry[];
};

/**
 * Everything parsing needs from an alert: the two meta bags. Provenance
 * (machine id, bucket, source range) is copied off the envelope by the sync,
 * not parsed, so it is not part of this interface.
 */
export type RawAlert = {
	events: RawEvent[];
	meta?: MetaEntry[];
};

export type ParsedAlertEnvelope = {
	integration: IntegrationId;
	entryType: AlertEntryType;
	entries: string[];
	/** Narrow, per-integration: discriminated by `aggregates.kind`. */
	aggregates: AlertAggregates;
	/** Cross-integration values: user agents, ja4h, CVEs. */
	facets: AlertFacets;
	/** Alert-level meta keys no aggregate claimed. */
	unparsed: Record<string, string>;
	events: ParsedEvent[];
};

function findIntegration(meta: MetaView): Integration<EventFields> | undefined {
	return INTEGRATIONS.find((integration) => integration.matches(meta));
}

function parseEventView(event: RawEvent, meta: MetaView): ParsedEvent {
	const integration = findIntegration(meta);

	// Every reader runs before unparsed() is taken
	const fields: EventFields = integration
		? integration.parseEvent(meta)
		: { kind: "unknown" };
	const facets = extractFacets(meta);
	const timestamp = toDateOrNull(meta.str("timestamp") ?? event.timestamp);
	const sourceIp = meta.str("source_ip");
	const datasourcePath = meta.str("datasource_path");
	const datasourceType = meta.str("datasource_type");

	return {
		integration: integration?.id ?? "unknown",
		timestamp,
		sourceIp,
		datasourcePath,
		datasourceType,
		fields,
		facets,
		unparsed: meta.unparsed(),
	};
}

/** One raw event → typed fields, facets, and whatever nobody claimed. */
export function parseEvent(event: RawEvent): ParsedEvent {
	return parseEventView(event, new MetaView(event.meta));
}

/**
 * Which integration an alert belongs to, by majority of its events.
 *
 * Not by the first event: an AppSec alert can carry a stray access-log event,
 * and a scenario that spans datasources should not flip on event order. A tie
 * goes to whichever integration is registered first, so the outcome never
 * depends on event order either.
 */
function resolveIntegration(events: ParsedEvent[]): IntegrationId {
	const votes = new Map<IntegrationId, number>();
	for (const event of events) {
		votes.set(event.integration, (votes.get(event.integration) ?? 0) + 1);
	}
	let winner: IntegrationId = "unknown";
	let best = 0;
	for (const integration of INTEGRATIONS) {
		const count = votes.get(integration.id) ?? 0;
		if (count > best) {
			winner = integration.id;
			best = count;
		}
	}
	return winner;
}

/**
 * Alert-level facets: the handful of values that appear on alerts from more
 * than one integration. Everything source-specific lives in that
 * integration's own `parseAggregates`.
 */
function extractAlertFacets(alertMeta: MetaView): AlertFacets {
	const userAgents = alertMeta.list("user_agent");
	const ja4h = alertMeta.list("ja4h");
	const cves = alertMeta.list("cve");
	const client = userAgents || ja4h ? { userAgents, ja4h } : undefined;
	return { client, cves };
}

/**
 * The two meta bags of an alert → its parsed events, which integration it
 * belongs to, its `entries[]`, aggregates and cross-integration facets.
 *
 * Pure, and takes plain data, so it runs identically at sync time over a live
 * LAPI alert and at read time over the JSON stored in `Alert.events` /
 * `Alert.meta`. That is what lets a parser improvement reach rows already in
 * the database without a re-sync.
 */
export function parseAlert(alert: RawAlert): ParsedAlertEnvelope {
	const views = alert.events.map((event) => new MetaView(event.meta));
	const events = alert.events.map((event, i) =>
		parseEventView(event, views[i]),
	);
	const alertMeta = new MetaView(alert.meta);
	const integrationId = resolveIntegration(events);
	const integration = INTEGRATIONS.find((i) => i.id === integrationId);

	// An integration without aggregates or entries still names its kind
	const aggregates =
		integration?.parseAggregates?.(alertMeta) ??
		({ kind: integrationId } as AlertAggregates);
	const facets = extractAlertFacets(alertMeta);
	const entries =
		integration?.extractEntries?.({
			events: views.filter((_, i) => events[i].integration === integrationId),
			alertMeta,
		}) ?? [];

	return {
		integration: integrationId,
		entryType: integration?.entryType ?? "none",
		entries,
		aggregates,
		facets,
		unparsed: alertMeta.unparsed(),
		events,
	};
}

/** Label for an integration id, for the UI. */
export function integrationLabel(id: IntegrationId): string {
	return INTEGRATIONS.find((i) => i.id === id)?.label ?? "Unknown";
}
