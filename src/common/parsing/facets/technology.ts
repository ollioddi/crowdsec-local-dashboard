import type { EventFacetDef } from "../types";

/** The stack a probe assumes, e.g. `generic-phpinfo`. */
export const technologyFacet = {
	id: "technology",
	extract(meta) {
		const name = meta.str("target_technology");
		return name === undefined ? undefined : { name };
	},
} satisfies EventFacetDef<"technology">;
