import {
	type Cell,
	type Column,
	type ColumnDef,
	columnFacetingFeature,
	columnFilteringFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	type Header,
	metaHelper,
	type ReactTable,
	type Row,
	type RowData,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
} from "@tanstack/react-table";
import {
	dateFilterFn,
	numberFilterFn,
	selectFilterFn,
	textFilterFn,
} from "./filters/filter-fns";
import type { FilterType } from "./filters/filter-operators";

export type DataTableColumnMeta = {
	sortable?: boolean;
	/** Filter UI and filter function for the column */
	filter?: FilterType;
	/** Include this column's value in the global text search */
	globalFilter?: boolean;
	visibleByDefault?: boolean;
	/** Used for filtering and sorting only, never rendered */
	filterOnly?: boolean;
	/** Where the cell goes on a mobile card. Columns without a header are actions. */
	card?: "title" | "badge" | "field" | "action";
};

// The single feature set every DataTable is built on
export const dataTableFeatures = tableFeatures({
	columnFilteringFeature,
	columnFacetingFeature,
	globalFilteringFeature,
	rowSortingFeature,
	rowPaginationFeature,
	rowExpandingFeature,
	columnVisibilityFeature,
	columnSizingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	expandedRowModel: createExpandedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	// Keys match FilterType so a column's meta.filter doubles as its filterFn
	filterFns: {
		text: textFilterFn,
		select: selectFilterFn,
		number: numberFilterFn,
		date: dateFilterFn,
	},
	// Everything the "auto" sort function can pick
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		basic: sortFn_basic,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
	columnMeta: metaHelper<DataTableColumnMeta>(),
});

type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
	DataTableFeatures,
	TData
>;
export type DataTableColumn<TData extends RowData> = Column<
	DataTableFeatures,
	TData,
	unknown
>;
export type DataTableHeader<TData extends RowData> = Header<
	DataTableFeatures,
	TData,
	unknown
>;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;
export type DataTableInstance<TData extends RowData> = ReactTable<
	DataTableFeatures,
	TData
>;
export type DataTableCell<TData extends RowData> = Cell<
	DataTableFeatures,
	TData,
	unknown
>;
