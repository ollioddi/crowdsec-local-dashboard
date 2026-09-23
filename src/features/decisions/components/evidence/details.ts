import type { EventFacets, ParsedEvent } from "@/common/parsing/types";
import type {
	AlertDetail,
	AlertProvenance,
} from "@/features/decisions/api/alert-detail";

/**
 * Facets the generic loop below must not repeat: the headline box renders
 * these four, and geo gets hand-written labels in `addEventDetails`.
 */
const FACETS_SHOWN_ELSEWHERE: ReadonlySet<keyof EventFacets> = new Set([
	"target",
	"cve",
	"technology",
	"fingerprint",
	"geo",
]);

/** Provenance the headline box shows in its header or footer line. */
const PROVENANCE_SHOWN_ELSEWHERE: ReadonlySet<keyof AlertProvenance> = new Set([
	"machineId",
	"capacity",
	"leakspeed",
	"simulated",
	"sourceRange",
]);

/** `asnNumber` → "asn number", `target_uri` → "target uri". */
function label(key: string): string {
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[._]/g, " ")
		.toLowerCase();
}

function add(out: Map<string, Set<string>>, key: string, value: unknown): void {
	for (const entry of Array.isArray(value) ? value : [value]) {
		if (entry === undefined || entry === null || entry === "") continue;
		const set = out.get(key) ?? new Set<string>();
		set.add(String(entry));
		out.set(key, set);
	}
}

/** Flattens one object's own fields, skipping the discriminator. */
function addObject(
	out: Map<string, Set<string>>,
	prefix: string,
	source: object,
	skip: ReadonlySet<string> = new Set(),
): void {
	for (const [key, value] of Object.entries(source)) {
		if (key === "kind" || skip.has(key)) continue;
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			addObject(out, `${prefix}${key} `, value);
			continue;
		}
		add(out, `${prefix}${label(key)}`, value);
	}
}

function addEventDetails(
	out: Map<string, Set<string>>,
	event: ParsedEvent,
): void {
	add(out, "source ip", event.sourceIp);
	add(out, "datasource", event.datasourcePath);
	add(out, "datasource type", event.datasourceType);

	const geo = event.facets.geo;
	if (geo) {
		add(out, "asn", geo.asnNumber);
		add(out, "asn org", geo.asnOrg);
		add(out, "country code", geo.isoCode);
		add(out, "in eu", geo.isInEU);
		add(out, "source range", geo.sourceRange);
	}

	for (const [name, facet] of Object.entries(event.facets)) {
		if (FACETS_SHOWN_ELSEWHERE.has(name as keyof EventFacets) || !facet)
			continue;
		addObject(out, `${label(name)} `, facet);
	}
}

/**
 * Everything the parsers understood but the headline box has no room for:
 * geo enrichment, datasource paths, alert-level aggregates, provenance ids.
 * Flattened into label → distinct values, ready for a disclosure, so nothing
 * a parser claimed vanishes.
 *
 * Data-driven on purpose: a field added to an aggregate or a new facet shows
 * up here without touching the UI. Values are collected as sets so a key that
 * differs across events shows every value rather than the last one.
 */
export function collectDetails(alert: AlertDetail): Record<string, string> {
	const out = new Map<string, Set<string>>();

	addObject(out, "", alert.aggregates);
	addObject(out, "", alert.provenance, PROVENANCE_SHOWN_ELSEWHERE);
	for (const event of alert.events) addEventDetails(out, event);

	return Object.fromEntries(
		[...out.entries()].map(([key, values]) => [key, [...values].join(", ")]),
	);
}

/**
 * Raw meta no parser claimed, across the alert and its events.
 *
 * Events from unrecognised sources are excluded: their own renderer already
 * prints the whole bag, and listing it twice reads as a bug.
 */
export function collectUnparsed(alert: AlertDetail): Record<string, string> {
	const out = new Map<string, Set<string>>();
	for (const [key, value] of Object.entries(alert.unparsed))
		add(out, key, value);
	for (const event of alert.events) {
		if (event.integration === "unknown") continue;
		for (const [key, value] of Object.entries(event.unparsed))
			add(out, key, value);
	}
	return Object.fromEntries(
		[...out.entries()].map(([key, values]) => [key, [...values].join(", ")]),
	);
}
