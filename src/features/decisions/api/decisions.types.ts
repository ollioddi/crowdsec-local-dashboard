import type { DecisionOrigin, DecisionType } from "@/generated/zod/schemas";

/** Hosts travel as a lookup keyed by IP, not embedded in every row. */
export type DecisionHost = {
	ip: string;
	scope: string;
	country: string | null;
	asName: string | null;
	asNumber: string | null;
};

/** One row of the decisions table. Deliberately free of nested objects. */
export type DecisionRow = {
	id: number;
	hostIp: string;
	type: DecisionType;
	origin: DecisionOrigin;
	scenario: string;
	duration: string;
	createdAt: Date | string;
	expiresAt: Date | string | null;
	active: boolean;
	/** Reported by LAPI, enforced by nobody. Omitted when false. */
	simulated?: boolean;
	/** Ip, Range, Country… Omitted for the default "Ip". */
	scope?: string;
	/** Omitted when zero; the expanded row lazy-loads the alerts. */
	alertCount?: number;
	/** Distinct alert entries (paths, ports, usernames) across those alerts. */
	entryCount?: number;
};

/** Wire shape of the decisions list: rows plus a deduplicated host lookup. */
export type DecisionsPayload = {
	decisions: DecisionRow[];
	hosts: Record<string, DecisionHost>;
};

/** A row joined with its host, as the table columns consume it. */
export type DecisionWithHost = DecisionRow & { host: DecisionHost };

const UNKNOWN_HOST: Omit<DecisionHost, "ip"> = {
	scope: "Ip",
	country: null,
	asName: null,
	asNumber: null,
};

/** Joins rows to hosts. Rows for one IP share a single host object. */
export function joinDecisionHosts(
	payload: DecisionsPayload | undefined,
): DecisionWithHost[] {
	if (!payload) return [];
	return payload.decisions.map((decision) => ({
		...decision,
		host: payload.hosts[decision.hostIp] ?? {
			ip: decision.hostIp,
			...UNKNOWN_HOST,
		},
	}));
}
