/**
 * SSH alert type — auth log events.
 *
 * Covers crowdsecurity/ssh-bf, ssh-slow-bf, ssh-time-based-bf, ssh-refused-conn, etc.
 * log_type: "ssh_auth" | "auth"
 *
 * sync-time:  extractEntries(alert) → unique targeted usernames
 * fetch-time: parseEvent(event, meta) → ParsedEventMeta with sshUser/sshService
 */
import type { AlertEvent, CrowdSecAlert } from "@/lib/crowdsec-lapi/types";
import {
	type AlertEntryType,
	type ParsedEventMeta,
	parseCommon,
	present,
} from "./common";

export const ENTRY_TYPE: AlertEntryType = "usernames";

/** Unique targeted usernames across all events. Stored in Alert.entries at sync time. */
export function extractEntries(alert: CrowdSecAlert): string[] {
	const seen = new Set<string>();
	for (const event of alert.events ?? []) {
		const meta = Object.fromEntries(event.meta.map((m) => [m.key, m.value]));
		const user = present(meta.ssh_user ?? meta.user);
		if (user) seen.add(user);
	}
	return [...seen];
}

/** Parses a single event into structured UI data. Called at fetch time. */
export function parseEvent(
	event: AlertEvent,
	meta: Record<string, string>,
): ParsedEventMeta {
	return {
		...parseCommon(meta, event),
		eventType: "ssh",
		sshUser: present(meta.ssh_user ?? meta.user),
		sshService: present(meta.service),
	};
}
