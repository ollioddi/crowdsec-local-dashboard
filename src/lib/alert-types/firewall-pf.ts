/**
 * Firewall / pf alert type — OPNsense pf_drop / pf_pass events.
 *
 * Covers firewallservices/* scenarios.
 * log_type: "pf_drop" | "pf_pass"
 *
 * sync-time:  extractEntries(alert) → dst_port list from alert-level meta
 *             e.g. ["tcp:3389", "tcp:445", "tcp:22"]
 *             (ports live in alert.meta["dst_port"] as a JSON string[],
 *              not in individual event meta — the pf parser aggregates them)
 * fetch-time: parseEvent(event, meta) → ParsedEventMeta with iface/rule/service
 */
import type { AlertEvent, CrowdSecAlert } from "@/lib/crowdsec-lapi/types";
import {
	type AlertEntryType,
	type ParsedEventMeta,
	parseCommon,
	present,
} from "./common";

export const ENTRY_TYPE: AlertEntryType = "ports";

/** Destination ports from alert-level meta. Stored in Alert.entries at sync time. */
export function extractEntries(alert: CrowdSecAlert): string[] {
	const raw = alert.meta?.find((m) => m.key === "dst_port")?.value;
	if (!raw) return [];
	try {
		return JSON.parse(raw) as string[];
	} catch {
		return [];
	}
}

/** Parses a single event into structured UI data. Called at fetch time. */
export function parseEvent(
	event: AlertEvent,
	meta: Record<string, string>,
): ParsedEventMeta {
	return {
		...parseCommon(meta, event),
		eventType: "firewall_pf",
		pfInterface: present(meta.iface),
		pfRuleNumber: present(meta.rulenr),
		pfRuleId: present(meta.ruleid),
		pfMachine: present(meta.machine),
		pfService: present(meta.service),
	};
}
