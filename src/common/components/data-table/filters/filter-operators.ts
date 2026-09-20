import { z } from "zod";

export const textOperators = [
	"contains",
	"equals",
	"notEquals",
	"startsWith",
	"endsWith",
	"isEmpty",
] as const;
export const selectOperators = ["isAnyOf", "isNoneOf"] as const;
export const numberOperators = ["eq", "neq", "gt", "gte", "lt", "lte"] as const;
export const dateOperators = [
	"on",
	"before",
	"onOrBefore",
	"after",
	"onOrAfter",
	"between",
] as const;

export const filterOperators = [
	...textOperators,
	...selectOperators,
	...numberOperators,
	...dateOperators,
] as const;

export type FilterOperator = (typeof filterOperators)[number];

export const operatorLabels: Record<FilterOperator, string> = {
	contains: "Contains",
	equals: "Equals",
	notEquals: "Does not equal",
	startsWith: "Starts with",
	endsWith: "Ends with",
	isEmpty: "Is empty",
	isAnyOf: "Is any of",
	isNoneOf: "Is none of",
	eq: "=",
	neq: "≠",
	gt: ">",
	gte: "≥",
	lt: "<",
	lte: "≤",
	on: "On",
	before: "Before",
	onOrBefore: "On or before",
	after: "After",
	onOrAfter: "On or after",
	between: "Between",
};

export const filterValueSchema = z.object({
	operator: z.enum(filterOperators),
	value: z.union([z.string(), z.array(z.string())]),
});

export type FilterValue = z.infer<typeof filterValueSchema>;

export type FilterType = "text" | "select" | "number" | "date";

/** Short human summary of an active filter, shown on the filter button. */
export function describeFilter(filter: FilterValue): string {
	const label = operatorLabels[filter.operator];
	if (filter.operator === "isEmpty") return label;
	const value = Array.isArray(filter.value)
		? filter.value.join(filter.operator === "between" ? " – " : ", ")
		: filter.value;
	return `${label} ${value}`;
}
