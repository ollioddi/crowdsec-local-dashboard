import type { ColumnVisibilityState, RowData } from "@tanstack/react-table";
import type {
	DataTableColumn,
	DataTableColumnDef,
	DataTableRow,
} from "./table-features";

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

export function columnLabel<TData extends RowData>(
	column: DataTableColumn<TData>,
): string {
	return typeof column.columnDef.header === "string"
		? column.columnDef.header
		: column.id;
}

/** Visibility from column meta: filter-only columns never show */
export function getDefaultColumnVisibility<TData extends RowData>(
	columns: ReadonlyArray<DataTableColumnDef<TData>>,
): ColumnVisibilityState {
	const visibility: ColumnVisibilityState = {};
	for (const col of columns) {
		const id =
			col.id ??
			("accessorKey" in col && typeof col.accessorKey === "string"
				? col.accessorKey
				: undefined);
		if (!id) continue;
		visibility[id] =
			!col.meta?.filterOnly && col.meta?.visibleByDefault !== false;
	}
	return visibility;
}

export const EXPAND_COLUMN_ID = "_expand";

/**
 * Action columns hold the icon buttons a row shows when collapsed. The expanded
 * panel carries the same actions as labelled buttons, so they are hidden there.
 */
export function isActionColumn<TData extends RowData>(
	column: DataTableColumn<TData>,
): boolean {
	if (column.id === EXPAND_COLUMN_ID) return false;
	const { header, meta } = column.columnDef;
	if (meta?.filterOnly) return false;
	if (meta?.card) return meta.card === "action";
	return typeof header !== "string" || header === "";
}

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
