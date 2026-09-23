import type { EventFacetDef } from "../types";

/**
 * What the request was aimed at.
 *
 * Every integration spells it differently: the Traefik access log calls it
 * `target_fqdn`, an AppSec block calls it `target_host`, and an in-band rule
 * event uses `target_fqdn` with the path in `uri`. Normalised here once so the
 * UI has a single field.
 */
export const targetFacet = {
	id: "target",
	extract(meta) {
		const fqdn = meta.str("target_fqdn", "target_host", "http_host");
		const uri = meta.str("target_uri", "uri");
		if (fqdn === undefined && uri === undefined) return undefined;
		return { fqdn, uri };
	},
} satisfies EventFacetDef<"target">;
