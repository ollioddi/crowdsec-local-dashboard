import type {
	ColumnFiltersState,
	ColumnVisibilityState,
	ExpandedState,
	PaginationState,
	SortingState,
	Updater,
} from "@tanstack/react-table";
import type { FilterValue } from "./filters/filter-operators";
import type { DataTableSearch } from "./search-schema";

export type DataTableNavigate = (options: {
	search: (prev: DataTableSearch) => DataTableSearch;
	replace?: boolean;
	resetScroll?: boolean;
}) => void;

interface UrlStateOptions {
	search: DataTableSearch;
	navigate: DataTableNavigate;
	defaultVisibility: ColumnVisibilityState;
}

function resolve<T>(updater: Updater<T>, current: T): T {
	return typeof updater === "function"
		? (updater as (old: T) => T)(current)
		: updater;
}

function sameVisibility(a: ColumnVisibilityState, b: ColumnVisibilityState) {
	const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const id of ids) {
		if ((a[id] ?? true) !== (b[id] ?? true)) return false;
	}
	return true;
}

/**
 * Maps the route's search params to TanStack Table state and turns every table
 * state change into a navigation, so the URL is the only place table state lives.
 */
export function useDataTableUrlState({
	search,
	navigate,
	defaultVisibility,
}: UrlStateOptions) {
	const sorting: SortingState = search.sort
		? [{ id: search.sort.field, desc: search.sort.order === "desc" }]
		: [];

	const columnFilters: ColumnFiltersState = Object.entries(
		search.filters ?? {},
	).map(([id, value]) => ({ id, value }));

	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.pageSize,
	};

	const expanded: ExpandedState = Object.fromEntries(
		(search.expanded ?? []).map((id) => [id, true]),
	);

	let columnVisibility = defaultVisibility;
	if (search.columns) {
		const visible = new Set(search.columns);
		columnVisibility = Object.fromEntries(
			Object.keys(defaultVisibility).map((id) => [
				id,
				defaultVisibility[id] === false ? false : visible.has(id),
			]),
		);
	}

	const push = (patch: Partial<DataTableSearch>) =>
		navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false });
	// Typing in the search box and toggling rows should not pile up history entries
	const replace = (patch: Partial<DataTableSearch>) =>
		navigate({
			search: (prev) => ({ ...prev, ...patch }),
			replace: true,
			resetScroll: false,
		});

	return {
		state: {
			sorting,
			columnFilters,
			pagination,
			expanded,
			columnVisibility,
			globalFilter: search.q ?? "",
		},

		onSortingChange: (updater: Updater<SortingState>) => {
			const [first] = resolve(updater, sorting);
			push({
				page: 1,
				sort: first
					? { field: first.id, order: first.desc ? "desc" : "asc" }
					: undefined,
			});
		},

		onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
			const next = resolve(updater, columnFilters);
			const filters: Record<string, FilterValue> = {};
			for (const filter of next) {
				filters[filter.id] = filter.value as FilterValue;
			}
			push({ page: 1, filters: next.length > 0 ? filters : undefined });
		},

		onGlobalFilterChange: (updater: Updater<string>) => {
			const next = resolve(updater, search.q ?? "");
			replace({ page: 1, q: next || undefined });
		},

		onPaginationChange: (updater: Updater<PaginationState>) => {
			const next = resolve(updater, pagination);
			const pageSizeChanged = next.pageSize !== pagination.pageSize;
			push({
				page: pageSizeChanged ? 1 : next.pageIndex + 1,
				pageSize: next.pageSize,
			});
		},

		onExpandedChange: (updater: Updater<ExpandedState>) => {
			const next = resolve(updater, expanded);
			// Only single rows are toggled, so `true` (expand all) never happens
			const ids =
				next === true
					? (search.expanded ?? [])
					: Object.keys(next).filter((id) => next[id]);
			replace({ expanded: ids.length > 0 ? ids : undefined });
		},

		onColumnVisibilityChange: (updater: Updater<ColumnVisibilityState>) => {
			const next = resolve(updater, columnVisibility);
			if (sameVisibility(next, defaultVisibility)) {
				push({ columns: undefined });
				return;
			}
			const visible = Object.keys(defaultVisibility).filter(
				(id) => next[id] ?? true,
			);
			push({ columns: visible });
		},

		resetFilters: () => push({ page: 1, filters: undefined, q: undefined }),
	};
}
