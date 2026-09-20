import { z } from "zod";
import { filterValueSchema } from "./filters/filter-operators";

const sortSchema = z.object({
	field: z.string(),
	order: z.enum(["asc", "desc"]),
});

export type DataTableSort = z.infer<typeof sortSchema>;

interface DataTableDefaults {
	pageSize?: number;
	sort?: DataTableSort;
}

/**
 * Search params every DataTable route validates with. Everything the table
 * remembers lives here, so a URL fully describes what the user is looking at.
 */
export function dataTableSearchSchema(defaults: DataTableDefaults = {}) {
	return z.object({
		page: z.number().int().positive().default(1),
		pageSize: z
			.number()
			.int()
			.positive()
			.default(defaults.pageSize ?? 10),
		sort: defaults.sort
			? sortSchema.default(defaults.sort)
			: sortSchema.optional(),
		filters: z.record(z.string(), filterValueSchema).optional(),
		q: z.string().optional(),
		/** Visible column ids, when they differ from the defaults */
		columns: z.array(z.string()).optional(),
		expanded: z.array(z.string()).optional(),
	});
}

export type DataTableSearch = z.output<
	ReturnType<typeof dataTableSearchSchema>
>;
