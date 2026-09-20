import { type RowData, useTable } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import {
	Table,
	TableHead,
	TableHeader,
	TableRow,
} from "@/common/components/ui/table";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { cn } from "@/common/lib/utils";
import DataTableCards from "./data-table-cards";
import DataTableHeaderCell from "./data-table-header-cell";
import DataTableRows from "./data-table-rows";
import DataTableToolbar from "./data-table-toolbar";
import PaginationBar from "./pagination-bar";
import type { DataTableSearch } from "./search-schema";
import {
	type DataTableColumnDef,
	type DataTableRow,
	dataTableFeatures,
} from "./table-features";
import {
	EXPAND_COLUMN_ID,
	getDefaultColumnVisibility,
	globalFilterFn,
} from "./table-utils";
import { type DataTableNavigate, useDataTableUrlState } from "./use-url-state";

interface DataTableProps<TData extends RowData> {
	columns: DataTableColumnDef<TData>[];
	data: TData[];
	/** Search params of the route, validated by `dataTableSearchSchema` */
	search: DataTableSearch;
	navigate: DataTableNavigate;
	/** Stable row id, used to keep expanded rows in the URL */
	getRowId: (row: TData) => string;
	renderSubComponent?: (row: DataTableRow<TData>) => ReactElement;
	searchPlaceholder?: string;
	emptyState?: ReactNode;
	/** Extra toolbar content, such as a live indicator */
	toolbarExtra?: ReactNode;
	className?: string;
}

export function DataTable<TData extends RowData>({
	columns,
	data,
	search,
	navigate,
	getRowId,
	renderSubComponent,
	searchPlaceholder,
	emptyState,
	toolbarExtra,
	className,
}: Readonly<DataTableProps<TData>>) {
	const isMobile = useIsMobile();
	const url = useDataTableUrlState({
		search,
		navigate,
		defaultVisibility: getDefaultColumnVisibility(columns),
	});

	// meta.filter names the registered filter function of the same name
	const tableColumns = columns.map((col) =>
		col.meta?.filter ? { ...col, filterFn: col.meta.filter } : col,
	);
	const expandColumn: DataTableColumnDef<TData> = {
		id: EXPAND_COLUMN_ID,
		size: 40,
		cell: ({ row }) => (
			<button
				type="button"
				aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
				className="flex h-full w-full items-center justify-center p-1"
				onClick={() => row.toggleExpanded()}
			>
				<ChevronDown
					className={cn(
						"h-4 w-4 text-muted-foreground transition-transform duration-200",
						row.getIsExpanded() && "rotate-180",
					)}
				/>
			</button>
		),
	};

	const table = useTable({
		features: dataTableFeatures,
		data,
		columns: renderSubComponent
			? [expandColumn, ...tableColumns]
			: tableColumns,
		getRowId: (row) => getRowId(row),
		getRowCanExpand: () => !!renderSubComponent,
		paginateExpandedRows: false,
		// Live data updates must not reset the page or collapse rows
		autoResetPageIndex: false,
		autoResetExpanded: false,
		globalFilterFn,
		state: url.state,
		onSortingChange: url.onSortingChange,
		onColumnFiltersChange: url.onColumnFiltersChange,
		onGlobalFilterChange: url.onGlobalFilterChange,
		onPaginationChange: url.onPaginationChange,
		onExpandedChange: url.onExpandedChange,
		onColumnVisibilityChange: url.onColumnVisibilityChange,
	});

	// Drop expanded ids for rows that no longer exist, so the URL never keeps stale ids
	const rowIds = table
		.getCoreRowModel()
		.rows.map((row) => row.id)
		.join("\n");
	const expandedIds = search.expanded;
	const setExpanded = url.onExpandedChange;
	useEffect(() => {
		if (!expandedIds?.length || rowIds === "") return;
		const known = new Set(rowIds.split("\n"));
		const kept = expandedIds.filter((id) => known.has(id));
		if (kept.length !== expandedIds.length) {
			setExpanded(Object.fromEntries(kept.map((id) => [id, true])));
		}
	}, [expandedIds, rowIds, setExpanded]);

	const totalItemsPreFiltered = table.getPreFilteredRowModel().rows.length;
	const totalItems = table.getFilteredRowModel().rows.length;

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<DataTableToolbar
				table={table}
				searchPlaceholder={searchPlaceholder}
				showColumnSelector={!isMobile}
				onResetFilters={url.resetFilters}
				extra={toolbarExtra}
			/>
			{isMobile ? (
				<DataTableCards
					table={table}
					renderSubComponent={renderSubComponent}
					emptyState={emptyState}
				/>
			) : (
				<div
					className="rounded-lg border overflow-x-auto"
					style={{ containerType: "inline-size" }}
				>
					<Table className="min-w-0">
						<TableHeader className="bg-muted">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											style={{ width: header.getSize() }}
										>
											<DataTableHeaderCell header={header} />
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<DataTableRows
							emptyState={emptyState}
							renderSubComponent={renderSubComponent}
							table={table}
						/>
					</Table>
				</div>
			)}
			<PaginationBar
				pagination={{
					...url.state.pagination,
					totalItems,
					totalPages: table.getPageCount(),
				}}
				onChange={table.setPagination}
				totalItemsPreFiltered={totalItemsPreFiltered}
			/>
		</div>
	);
}
