import { type RowData, useTable } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@/common/components/ui/button";
import {
	Table,
	TableHead,
	TableHeader,
	TableRow,
} from "@/common/components/ui/table";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { usePullToRefresh } from "@/common/hooks/use-pull-to-refresh";
import { cn } from "@/common/lib/utils";
import DataTableCards from "./data-table-cards";
import DataTableHeaderCell from "./data-table-header-cell";
import DataTableRows from "./data-table-rows";
import DataTableToolbar from "./data-table-toolbar";
import PaginationBar from "./pagination-bar";
import { PullToRefreshIndicator } from "./pull-to-refresh-indicator";
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
	/** Enables pull-to-refresh on touch devices */
	onRefresh?: () => Promise<unknown> | undefined;
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
	onRefresh,
	className,
}: Readonly<DataTableProps<TData>>) {
	const isMobile = useIsMobile();
	// Rows scroll in here, not the window
	const scrollRef = useRef<HTMLDivElement>(null);
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
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
				aria-expanded={row.getIsExpanded()}
				onClick={() => row.toggleExpanded()}
			>
				<ChevronDown
					className={cn(
						"size-4 text-muted-foreground transition-transform duration-200",
						row.getIsExpanded() && "rotate-180",
					)}
				/>
			</Button>
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

	const pull = usePullToRefresh(scrollRef, onRefresh);

	const totalItemsPreFiltered = table.getPreFilteredRowModel().rows.length;
	const totalItems = table.getFilteredRowModel().rows.length;

	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-3 overscroll-contain",
				className,
			)}
		>
			<div className="shrink-0">
				<DataTableToolbar
					table={table}
					searchPlaceholder={searchPlaceholder}
					showColumnSelector={!isMobile}
					onResetFilters={url.resetFilters}
				/>
			</div>

			{isMobile ? (
				<div
					ref={scrollRef}
					data-scroll-container
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
				>
					<PullToRefreshIndicator {...pull} />
					<DataTableCards
						table={table}
						scrollRef={scrollRef}
						renderSubComponent={renderSubComponent}
						emptyState={emptyState}
					/>
				</div>
			) : (
				<div
					ref={scrollRef}
					data-scroll-container
					className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border"
				>
					{/* The query context sits inside the scroller, so 100cqi is the
					    visible width excluding the scrollbar, while the table itself
					    may be wider and scroll under it. */}
					<div style={{ containerType: "inline-size" }}>
						<Table className="min-w-0">
							<TableHeader className="sticky top-0 z-20 bg-muted shadow-[inset_0_-1px_0_var(--border)]">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id} className="border-0">
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
								scrollRef={scrollRef}
								table={table}
							/>
						</Table>
					</div>
				</div>
			)}

			<div className="shrink-0">
				<PaginationBar
					pagination={{
						...url.state.pagination,
						totalItems,
						totalPages: table.getPageCount(),
					}}
					onChange={(next) => {
						scrollRef.current?.scrollTo({ top: 0 });
						table.setPagination(next);
					}}
					totalItemsPreFiltered={totalItemsPreFiltered}
				/>
			</div>
		</div>
	);
}
