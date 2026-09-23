import type { EventFacetDef } from "../types";

/**
 * GeoIP / ASN enrichment. Added by CrowdSec's own s02-enrich stage, so it
 * rides along on every event regardless of which integration produced it.
 */
export const geoFacet = {
	id: "geo",
	extract(meta) {
		const asnNumber = meta.str("ASNNumber", "ASNumber", "asn_number");
		const asnOrg = meta.str("ASNOrg", "asn_org");
		const isoCode = meta.str("IsoCode", "iso_code");
		const isInEU = meta.bool("IsInEU");
		const sourceRange = meta.str("SourceRange", "source_range");

		if (
			asnNumber === undefined &&
			asnOrg === undefined &&
			isoCode === undefined &&
			isInEU === undefined &&
			sourceRange === undefined
		) {
			return undefined;
		}
		return { asnNumber, asnOrg, isoCode, isInEU, sourceRange };
	},
} satisfies EventFacetDef<"geo">;
