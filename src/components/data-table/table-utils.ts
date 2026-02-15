import type {
	ColumnDef,
	FilterFn,
	Row,
	VisibilityState,
} from "@tanstack/react-table";

export type PageElement = number | "...";

export const calculatePages = (
	currentPage: number,
	totalPages: number,
): PageElement[] => {
	const maxPageNumbersToShow = 7;
	let pages: PageElement[];

	if (totalPages <= maxPageNumbersToShow) {
		pages = Array.from<number>({ length: totalPages }).map((_, index) => index);
	} else {
		pages = Array.from<PageElement>({ length: maxPageNumbersToShow }).fill(0);
		pages[0] = 0;
		pages[maxPageNumbersToShow - 1] = totalPages - 1;

		if (currentPage <= 3) {
			for (let index = 1; index < maxPageNumbersToShow - 2; index++) {
				pages[index] = index;
			}
			pages[maxPageNumbersToShow - 2] = "...";
		} else if (currentPage >= totalPages - 4) {
			pages[1] = "...";
			for (
				let index = 2, index_ = totalPages - 5;
				index < maxPageNumbersToShow - 1;
				index++, index_++
			) {
				pages[index] = index_;
			}
		} else {
			pages[1] = "...";
			pages[maxPageNumbersToShow - 2] = "...";
			pages[2] = currentPage - 1;
			pages[3] = currentPage;
			pages[4] = currentPage + 1;
		}
	}

	return pages;
};

/**
 * Custom global filter that only searches columns whose meta has `globalFilter: true`.
 */
export const globalFilterFn: FilterFn<unknown> = <TData>(
	row: Row<TData>,
	_columnId: string,
	filterValue: string,
): boolean => {
	if (!filterValue) return true;
	const search = filterValue.toLowerCase();

	const table = (
		row as unknown as {
			_getAllCellsByColumnId: () => Record<
				string,
				{
					column: { columnDef: { meta?: { globalFilter?: boolean } } };
					getValue: () => unknown;
				}
			>;
		}
	)._getAllCellsByColumnId();

	for (const [, cell] of Object.entries(table)) {
		if (!cell.column.columnDef.meta?.globalFilter) continue;
		const value = cell.getValue();
		if (value != null && String(value).toLowerCase().includes(search)) {
			return true;
		}
	}
	return false;
};

/** Function to get the default visibility state of columns as defined by the extended column meta */
export function getDefaultColumnVisibility<TData, TValue>(
	columns: ColumnDef<TData, TValue>[],
	isMobile = false,
): VisibilityState {
	return columns.reduce<VisibilityState>((acc, col) => {
		// TanStack Table uses either `id` or `accessorKey` as the column identifier
		const columnId =
			col.id ??
			(typeof (col as { accessorKey?: unknown }).accessorKey === "string"
				? (col as { accessorKey: string }).accessorKey
				: undefined);
		if (columnId == null) {
			return acc;
		}

		const vbd = col.meta?.visibleByDefault;
		const isObj = typeof vbd === "object" && vbd !== null;
		const visibleDesktop = isObj ? vbd.desktop : vbd;
		const visibleMobile = isObj ? vbd.mobile : vbd;

		const showColumn = isMobile
			? (visibleMobile ?? true)
			: (visibleDesktop ?? true);

		acc[columnId] = showColumn;
		return acc;
	}, {});
}
