import type {
	EventFacets,
	IntegrationId,
	ParsedEvent,
} from "@/common/parsing/types";
import type { AlertDetail } from "@/features/decisions/api/alert-detail";

/**
 * Facets the generic loop below must not repeat. The evidence renders
 * cve, technology and fingerprint; the facts column renders geo.
 */
const FACETS_SHOWN_ELSEWHERE: ReadonlySet<keyof EventFacets> = new Set([
	"cve",
	"technology",
	"fingerprint",
	"geo",
]);

type Collected = Map<string, Set<string>>;

/** `asnNumber` → "asn number", `target_uri` → "target uri". */
function label(key: string): string {
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[._]/g, " ")
		.toLowerCase();
}

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || value === "";
}

function isPlainObject(value: unknown): value is object {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(out: Collected, key: string, value: unknown): void {
	for (const entry of Array.isArray(value) ? value : [value]) {
		if (isBlank(entry)) continue;
		const set = out.get(key) ?? new Set<string>();
		set.add(String(entry));
		out.set(key, set);
	}
}

/** Flattens one object's own fields, skipping the discriminator. */
function addObject(out: Collected, prefix: string, source: object): void {
	for (const [key, value] of Object.entries(source)) {
		if (key === "kind") continue;
		if (isPlainObject(value)) addObject(out, `${prefix}${key} `, value);
		else add(out, `${prefix}${label(key)}`, value);
	}
}

/** Which of an integration's fields its renderer draws. */
export type ShownFields = (kind: IntegrationId) => ReadonlySet<string>;

function addEventDetails(
	out: Collected,
	event: ParsedEvent,
	hostIp: string | undefined,
	shown: ShownFields,
): void {
	// The decision's own IP heads the row; only a differing one is news
	if (event.sourceIp !== hostIp) add(out, "source ip", event.sourceIp);

	const drawn = shown(event.fields.kind);
	for (const [key, value] of Object.entries(event.fields)) {
		if (key !== "kind" && !drawn.has(key)) add(out, label(key), value);
	}

	for (const [name, facet] of Object.entries(event.facets)) {
		if (FACETS_SHOWN_ELSEWHERE.has(name as keyof EventFacets) || !facet)
			continue;
		if (name === "target") {
			// AppSec draws both fields; HTTP draws the hostname beside its path.
			if (event.integration === "appsec") continue;
			const target = event.facets.target;
			if (event.integration !== "traefik-http")
				add(out, "target fqdn", target?.fqdn);
			if (
				event.fields.kind !== "traefik-http" ||
				target?.uri !== event.fields.path
			) {
				add(out, "target uri", target?.uri);
			}
			continue;
		}
		addObject(out, `${label(name)} `, facet);
	}
}

function toRecord(out: Collected): Record<string, string> {
	return Object.fromEntries(
		[...out.entries()].map(([key, values]) => [key, [...values].join(", ")]),
	);
}

const NOTHING_SHOWN: ShownFields = () => new Set();

/** Match aggregate fields to the corresponding event values, not unrelated text. */
function representedSummaries(alert: AlertDetail): Collected {
	const out: Collected = new Map();
	for (const event of alert.events) {
		const fields = event.fields;
		add(out, "target uris", event.facets.target?.uri);
		switch (fields.kind) {
			case "traefik-http":
				add(out, "methods", fields.verb);
				add(out, "statuses", fields.status);
				add(out, "target uris", fields.path);
				add(out, "user agents", fields.userAgent);
				break;
			case "appsec":
				add(out, "methods", fields.method);
				add(out, "rules", fields.ruleName);
				add(out, "rule names", fields.ruleName);
				add(out, "descriptions", fields.description);
				add(out, "matched zones", fields.matchedZones);
				break;
			case "ssh":
				add(out, "usernames", fields.user);
				break;
		}
	}
	if (alert.entryType === "ports") add(out, "dst ports", alert.entries);
	if (alert.entryType === "usernames") add(out, "usernames", alert.entries);
	return out;
}

/**
 * Whatever the parsers understood that nothing else in the panel renders:
 * a field the integration reads but its renderer does not draw yet, a facet
 * no slot claims yet, and a source IP that differs from the decision's.
 * Aggregate values absent from the retained events are included too.
 */
export function collectDetails(
	alert: AlertDetail,
	hostIp?: string,
	shown: ShownFields = NOTHING_SHOWN,
): Record<string, string> {
	const out: Collected = new Map();
	for (const event of alert.events) {
		addEventDetails(out, event, hostIp, shown);
	}
	// LAPI may retain fewer events than the aggregate covers. Keep summary
	// values that are not already available in the event fields or entry chips.
	const represented = representedSummaries(alert);
	const summaries: Collected = new Map();
	addObject(summaries, "", alert.aggregates);
	add(summaries, "user agents", alert.facets.client?.userAgents);
	for (const [key, values] of summaries) {
		add(
			out,
			key,
			[...values].filter((value) => !represented.get(key)?.has(value)),
		);
	}
	return toRecord(out);
}

/**
 * Raw meta no parser claimed, across the alert and its events.
 *
 * Events from unrecognised sources are excluded: their own renderer already
 * prints the whole bag, and listing it twice reads as a bug.
 */
export function collectUnparsed(alert: AlertDetail): Record<string, string> {
	const out: Collected = new Map();
	for (const [key, value] of Object.entries(alert.unparsed))
		add(out, key, value);
	for (const event of alert.events) {
		if (event.integration === "unknown") continue;
		for (const [key, value] of Object.entries(event.unparsed))
			add(out, key, value);
	}
	return toRecord(out);
}
