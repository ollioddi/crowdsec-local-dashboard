import type { EventFacetDef } from "../types";

/** The vulnerability a probe is shopping for, tagged by the scenario. */
export const cveFacet = {
	id: "cve",
	extract(meta) {
		const id = meta.str("cve");
		return id === undefined ? undefined : { id };
	},
} satisfies EventFacetDef<"cve">;
