import type { EventFacetDef } from "../types";

/**
 * Client fingerprints. JA4H hashes the shape of the HTTP request itself, so it
 * stays put while a scanner rotates IPs and forges User-Agent strings.
 */
export const fingerprintFacet = {
	id: "fingerprint",
	extract(meta) {
		const ja4h = meta.str("ja4h");
		return ja4h === undefined ? undefined : { ja4h };
	},
} satisfies EventFacetDef<"fingerprint">;
