import type { ColumnVisibilityState, RowData } from "@tanstack/react-table";
import type { DataTableColumnDef, DataTableRow } from "./table-features";

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

/** Global filter that only searches columns whose meta has `globalFilter: true`. */
export function globalFilterFn<TData extends RowData>(
	row: DataTableRow<TData>,
	_columnId: string,
	filterValue: string,
): boolean {
	if (!filterValue) return true;
	const search = filterValue.toLowerCase();

	for (const cell of Object.values(row.getAllCellsByColumnId())) {
		if (!cell.column.columnDef.meta?.globalFilter) continue;
		const value = cell.getValue();
		if (value != null && String(value).toLowerCase().includes(search)) {
			return true;
		}
	}
	return false;
}

/** Default visibility of each column from its `visibleByDefault` meta */
export function getDefaultColumnVisibility<TData extends RowData>(
	columns: ReadonlyArray<DataTableColumnDef<TData>>,
	isMobile = false,
): ColumnVisibilityState {
	return columns.reduce<ColumnVisibilityState>((acc, col) => {
		const columnId =
			col.id ??
			("accessorKey" in col && typeof col.accessorKey === "string"
				? col.accessorKey
				: undefined);
		if (columnId == null) {
			return acc;
		}

		const vbd = col.meta?.visibleByDefault;
		const isObj = typeof vbd === "object" && vbd !== null;
		const visibleDesktop = isObj ? vbd.desktop : vbd;
		const visibleMobile = isObj ? vbd.mobile : vbd;

		acc[columnId] = isMobile
			? (visibleMobile ?? true)
			: (visibleDesktop ?? true);
		return acc;
	}, {});
}
