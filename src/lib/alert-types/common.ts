import type { AlertEvent } from "@/lib/crowdsec-lapi/types";

/** Discriminates the raw log format that produced the alert events. */
export type EventType = "http" | "firewall_pf" | "ssh" | "unknown";

/** Matches the AlertEntryType Prisma enum — describes what entries[] contains. */
export type AlertEntryType = "paths" | "ports" | "usernames" | "none";

/** Structured event data returned to the UI for the expanded row. */
export type ParsedEventMeta = {
	eventType: EventType;
	timestamp: Date;
	sourceIp?: string;
	// Common enrichment
	asnNumber?: string;
	asnOrg?: string;
	isoCode?: string;
	isInEU?: boolean;
	sourceRange?: string;
	datasourcePath?: string;
	// HTTP (Traefik access log)
	httpVerb?: string;
	httpPath?: string;
	httpStatus?: number;
	httpUserAgent?: string;
	traefikRouterName?: string;
	// Firewall / OPNsense pf
	pfInterface?: string;
	pfRuleNumber?: string;
	pfRuleId?: string;
	pfMachine?: string;
	pfService?: string;
	// SSH
	sshUser?: string;
	sshService?: string;
};

export function present(value: string | undefined): string | undefined {
	return value === undefined || value === "-" ? undefined : value;
}

export function extractMeta(event: AlertEvent): Record<string, string> {
	return Object.fromEntries(event.meta.map((m) => [m.key, m.value]));
}

export function parseCommon(
	meta: Record<string, string>,
	event: AlertEvent,
): Pick<
	ParsedEventMeta,
	| "timestamp"
	| "sourceIp"
	| "asnNumber"
	| "asnOrg"
	| "isoCode"
	| "isInEU"
	| "sourceRange"
	| "datasourcePath"
> {
	const rawTs = meta.timestamp ?? event.timestamp;
	return {
		timestamp: rawTs ? new Date(rawTs) : new Date(),
		sourceIp: present(meta.source_ip),
		asnNumber: present(meta.ASNNumber),
		asnOrg: present(meta.ASNOrg),
		isoCode: present(meta.IsoCode),
		isInEU:
			meta.IsInEU === undefined
				? undefined
				: meta.IsInEU.toLowerCase() === "true",
		sourceRange: present(meta.SourceRange),
		datasourcePath: present(meta.datasource_path),
	};
}

/**
 * Detects the event type from raw meta.
 * Primary: log_type value. Fallback: presence of type-specific keys.
 */
export function detectEventType(meta: Record<string, string>): EventType {
	switch (meta.log_type) {
		case "http_access-log":
			return "http";
		case "pf_drop":
		case "pf_pass":
			return "firewall_pf";
		case "ssh_auth":
		case "auth":
			return "ssh";
		default:
			if (meta.http_verb !== undefined || meta.http_path !== undefined)
				return "http";
			if (meta.iface !== undefined || meta.rulenr !== undefined)
				return "firewall_pf";
			if (meta.ssh_user !== undefined) return "ssh";
			return "unknown";
	}
}
