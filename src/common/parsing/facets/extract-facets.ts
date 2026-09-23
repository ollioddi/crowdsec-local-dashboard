import type { MetaView } from "../meta";
import type { EventFacetDef, EventFacets } from "../types";
import { cveFacet } from "./cve";
import { fingerprintFacet } from "./fingerprint";
import { geoFacet } from "./geo";
import { targetFacet } from "./target";
import { technologyFacet } from "./technology";

/** Any facet definition, each still tied to its own key. */
type AnyFacetDef = {
	[K in keyof EventFacets]-?: EventFacetDef<K>;
}[keyof EventFacets];

/**
 * Every facet, run over every event. To add one: write the module, add its key
 * to `EventFacets` in `../types.ts`, and list it here.
 */
const EVENT_FACETS: readonly AnyFacetDef[] = [
	geoFacet,
	targetFacet,
	cveFacet,
	technologyFacet,
	fingerprintFacet,
];

// Generic so the write is checked against the one key the facet is tied to
function runFacet<K extends keyof EventFacets>(
	facets: EventFacets,
	facet: EventFacetDef<K>,
	meta: MetaView,
): void {
	const value = facet.extract(meta);
	if (value !== undefined) facets[facet.id] = value;
}

/** Runs every facet over one event's meta. Absent facets stay absent. */
export function extractFacets(meta: MetaView): EventFacets {
	const facets: EventFacets = {};
	for (const facet of EVENT_FACETS) runFacet(facets, facet, meta);
	return facets;
}
