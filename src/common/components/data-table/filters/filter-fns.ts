import { constructFilterFn } from "@tanstack/react-table";
import type { FilterValue } from "./filter-operators";

export const textFilterFn = constructFilterFn({
	filter: (dataValue: unknown, filter: FilterValue) => {
		const cell = String(dataValue ?? "").toLowerCase();
		const value = String(filter.value).toLowerCase();
		switch (filter.operator) {
			case "isEmpty":
				return cell === "";
			case "contains":
				return cell.includes(value);
			case "equals":
				return cell === value;
			case "notEquals":
				return cell !== value;
			case "startsWith":
				return cell.startsWith(value);
			case "endsWith":
				return cell.endsWith(value);
			default:
				return true;
		}
	},
	autoRemove: (filter: FilterValue | undefined) =>
		!filter ||
		(filter.operator !== "isEmpty" && String(filter.value).trim() === ""),
});

export const selectFilterFn = constructFilterFn({
	filter: (dataValue: unknown, filter: FilterValue) => {
		const values = Array.isArray(filter.value) ? filter.value : [];
		const match = values.includes(String(dataValue));
		return filter.operator === "isNoneOf" ? !match : match;
	},
	autoRemove: (filter: FilterValue | undefined) =>
		!filter || !Array.isArray(filter.value) || filter.value.length === 0,
});

export const numberFilterFn = constructFilterFn({
	filter: (dataValue: unknown, filter: FilterValue) => {
		const cell = Number(dataValue);
		const value = Number(filter.value);
		if (Number.isNaN(cell) || Number.isNaN(value)) return false;
		switch (filter.operator) {
			case "eq":
				return cell === value;
			case "neq":
				return cell !== value;
			case "gt":
				return cell > value;
			case "gte":
				return cell >= value;
			case "lt":
				return cell < value;
			case "lte":
				return cell <= value;
			default:
				return true;
		}
	},
	autoRemove: (filter: FilterValue | undefined) =>
		!filter || String(filter.value).trim() === "",
});

/** Local calendar day of a Date, ISO string or YYYY-MM-DD, as a comparable number */
function dayOf(raw: unknown): number | null {
	if (raw == null || raw === "") return null;
	const date = raw instanceof Date ? raw : new Date(String(raw));
	if (Number.isNaN(date.getTime())) return null;
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).getTime();
}

export const dateFilterFn = constructFilterFn({
	filter: (dataValue: unknown, filter: FilterValue) => {
		const cell = dayOf(dataValue);
		if (cell === null) return false;
		if (filter.operator === "between") {
			const [start, end] = Array.isArray(filter.value) ? filter.value : [];
			const from = dayOf(start);
			const to = dayOf(end);
			return from !== null && to !== null && cell >= from && cell <= to;
		}
		const day = dayOf(filter.value);
		if (day === null) return true;
		switch (filter.operator) {
			case "on":
				return cell === day;
			case "before":
				return cell < day;
			case "onOrBefore":
				return cell <= day;
			case "after":
				return cell > day;
			case "onOrAfter":
				return cell >= day;
			default:
				return true;
		}
	},
	autoRemove: (filter: FilterValue | undefined) => {
		if (!filter) return true;
		if (filter.operator === "between") {
			return !Array.isArray(filter.value) || filter.value.length < 2;
		}
		return String(filter.value).trim() === "";
	},
});
