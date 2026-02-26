/**
 * Alert type registry — two entry points:
 *
 *   parseAlertEvent(event)   — fetch-time, called in decisions.functions.ts
 *                              converts a raw AlertEvent into ParsedEventMeta for the UI
 *
 *   extractAlertData(alert)  — sync-time, called in sync/db.ts
 *                              extracts { entries, entryType } for DB storage
 */
import type { AlertEvent, CrowdSecAlert } from "@/lib/crowdsec-lapi/types";
import {
	type AlertEntryType,
	detectEventType,
	extractMeta,
	type ParsedEventMeta,
	parseCommon,
} from "./common";
import * as firewallPf from "./firewall-pf";
import * as http from "./http";
import * as ssh from "./ssh";

export type { AlertEntryType, EventType, ParsedEventMeta } from "./common";

export type AlertExtract = {
	entries: string[];
	entryType: AlertEntryType;
};

/** Converts a stored raw AlertEvent into typed UI data. Called at fetch time. */
export function parseAlertEvent(event: AlertEvent): ParsedEventMeta {
	const meta = extractMeta(event);
	switch (detectEventType(meta)) {
		case "http":
			return http.parseEvent(event, meta);
		case "firewall_pf":
			return firewallPf.parseEvent(event, meta);
		case "ssh":
			return ssh.parseEvent(event, meta);
		default:
			return { ...parseCommon(meta, event), eventType: "unknown" };
	}
}

/** Extracts entries[] and entryType for DB storage. Called at sync time. */
export function extractAlertData(alert: CrowdSecAlert): AlertExtract {
	const firstEvent = alert.events?.[0];
	if (!firstEvent) return { entries: [], entryType: "none" };

	switch (detectEventType(extractMeta(firstEvent))) {
		case "http":
			return {
				entries: http.extractEntries(alert),
				entryType: http.ENTRY_TYPE,
			};
		case "firewall_pf":
			return {
				entries: firewallPf.extractEntries(alert),
				entryType: firewallPf.ENTRY_TYPE,
			};
		case "ssh":
			return { entries: ssh.extractEntries(alert), entryType: ssh.ENTRY_TYPE };
		default:
			return { entries: [], entryType: "none" };
	}
}
