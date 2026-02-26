/**
 * HTTP alert type — Traefik access log events.
 *
 * Covers all crowdsecurity/http-* and CVE scenarios that log via Traefik.
 * log_type: "http_access-log"
 *
 * sync-time:  extractEntries(alert) → unique http_paths stored in Alert.entries
 * fetch-time: parseEvent(event, meta) → ParsedEventMeta with verb/path/status
 */
import type { AlertEvent, CrowdSecAlert } from "@/lib/crowdsec-lapi/types";
import {
	type AlertEntryType,
	type ParsedEventMeta,
	parseCommon,
	present,
} from "./common";

export const ENTRY_TYPE: AlertEntryType = "paths";

/** Unique http_paths across all events. Stored in Alert.entries at sync time. */
export function extractEntries(alert: CrowdSecAlert): string[] {
	const seen = new Set<string>();
	for (const event of alert.events ?? []) {
		const path = event.meta.find((m) => m.key === "http_path")?.value;
		if (path && path !== "-") seen.add(path);
	}
	return [...seen];
}

/** Parses a single event into structured UI data. Called at fetch time. */
export function parseEvent(
	event: AlertEvent,
	meta: Record<string, string>,
): ParsedEventMeta {
	const rawStatus = meta.http_status
		? Number.parseInt(meta.http_status, 10)
		: undefined;
	return {
		...parseCommon(meta, event),
		eventType: "http",
		httpVerb: present(meta.http_verb),
		httpPath: present(meta.http_path),
		httpStatus:
			rawStatus !== undefined && !Number.isNaN(rawStatus)
				? rawStatus
				: undefined,
		httpUserAgent: present(meta.http_user_agent),
		traefikRouterName: present(meta.traefik_router_name),
	};
}
