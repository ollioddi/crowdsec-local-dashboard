import {
	type Column,
	type ColumnDef,
	columnFacetingFeature,
	columnFilteringFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	constructFilterFn,
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

export type DataTableColumnMeta = {
	sortable?: boolean;
	visibleByDefault?: { desktop?: boolean; mobile?: boolean } | boolean;
	/** Include this column's value in the global text filter */
	globalFilter?: boolean;
	/** Human-readable label shown in the expanded mobile row */
	expandedLabel?: string;
	/** Shorter column header text used on mobile to avoid overflow */
	mobileHeader?: string;
	/** Column filter variant: 'select' for multi-select faceted filter */
	filterVariant?: "select";
};

/** Keeps rows whose cell value is one of the selected facet values. */
const isOneOf = constructFilterFn({
	filter: (dataValue: unknown, filterValue: string[]) =>
		filterValue.includes(String(dataValue)),
	autoRemove: (filterValue: unknown) =>
		!Array.isArray(filterValue) || filterValue.length === 0,
});

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
	filterFns: { isOneOf },
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
