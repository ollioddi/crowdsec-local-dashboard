"use no memo";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type Table as ReactTableType,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import DataTableHeaderCell from "./data-table-header-cell";
import DataTableRows from "./data-table-rows";
import PaginationBar from "./pagination-bar";
import {
	getDefaultColumnVisibility,
	getMobileColumnVisibility,
	globalFilterFn,
} from "./table-utils";

const EMPTY_FILTERS: ColumnFiltersState = [];
const EMPTY_SORTING: SortingState = [];
const EMPTY_GLOBAL_FILTER = "";

interface DataTableProps<TData> {
	columns: ColumnDef<TData, unknown>[];
	data: TData[];
	isLoading?: boolean;
	className?: string;
	emptyState?: ReactNode;
	/** Render extra content above the table (e.g. toolbar, search) */
	header?: (table: ReactTableType<TData>) => ReactNode;
	/** Custom sub-component for expandable rows (desktop) */
	renderSubComponent?: (props: { row: Row<TData> }) => ReactElement;
	/**
	 * Custom mobile expanded row renderer.
	 * When provided, replaces the auto-generated hidden-column list.
	 * Receives the full row object so you have access to all values and original data.
	 */
	mobileExpandedRow?: (row: Row<TData>) => ReactElement;
	/** Initial column filter state (e.g. from URL search params) */
	initialColumnFilters?: ColumnFiltersState;
	/** Initial sorting state */
	initialSorting?: SortingState;
	/** Initial global filter state */
	initialGlobalFilter?: string;
}

export function DataTable<TData>({
	columns,
	data,
	isLoading = false,
	className,
	emptyState,
	header,
	renderSubComponent,
	mobileExpandedRow,
	initialColumnFilters = EMPTY_FILTERS,
	initialSorting = EMPTY_SORTING,
	initialGlobalFilter = EMPTY_GLOBAL_FILTER,
}: Readonly<DataTableProps<TData>>) {
	const isMobile = useIsMobile();

	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [columnFilters, setColumnFilters] =
		useState<ColumnFiltersState>(initialColumnFilters);
	const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		getDefaultColumnVisibility(columns),
	);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	// Sync column filters when initialColumnFilters changes (e.g. URL search params)
	useEffect(() => {
		setColumnFilters(initialColumnFilters);
	}, [initialColumnFilters]);

	const hasMobileHiddenCols = useMemo(
		() => columns.some((c) => c.meta?.hideOnMobile),
		[columns],
	);

	// On mobile, hide columns marked with hideOnMobile and enable row expansion
	// On desktop, show all columns
	useEffect(() => {
		const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
		setColumnVisibility((prev) => ({
			...getDefaultColumnVisibility(columns),
			...prev,
			...mobileVisibility,
		}));
	}, [isMobile, columns]);

	// Build the mobile expansion sub-component.
	// If mobileExpandedRow is provided, delegate to it for full custom rendering.
	// Otherwise, auto-render any columns marked hideOnMobile.
	const mobileSubComponent = useMemo(() => {
		if (!isMobile) return renderSubComponent;

		if (mobileExpandedRow) {
			return ({ row }: { row: Row<TData> }) => mobileExpandedRow(row);
		}

		const hiddenCols = columns.filter((col) => col.meta?.hideOnMobile);
		if (hiddenCols.length === 0) return renderSubComponent;

		return ({ row }: { row: Row<TData> }) => (
			<div className="space-y-4 py-3 text-sm">
				{hiddenCols.map((col) => {
					const columnId =
						col.id ??
						(typeof (col as { accessorKey?: unknown }).accessorKey === "string"
							? (col as { accessorKey: string }).accessorKey
							: undefined);
					if (!columnId) return null;

					const label =
						col.meta?.expandedLabel ??
						(typeof col.header === "string" ? col.header : columnId);

					const cell = row.getAllCells().find((c) => c.column.id === columnId);
					if (!cell) return null;

					// No label → render cell content full-width (e.g. action buttons)
					if (!label) {
						return (
							<div key={columnId}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</div>
						);
					}

					return (
						<div key={columnId} className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">
								{label}
							</span>
							<span>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</span>
						</div>
					);
				})}
				{renderSubComponent?.({ row })}
			</div>
		);
	}, [isMobile, columns, renderSubComponent, mobileExpandedRow]);

	// On mobile, prepend a dedicated chevron expand button column
	const effectiveColumns = useMemo((): ColumnDef<TData, unknown>[] => {
		if (!isMobile || !hasMobileHiddenCols) return columns;

		const expandCol: ColumnDef<TData, unknown> = {
			id: "_expand",
			size: 40,
			cell: ({ row }) => {
				if (!row.getCanExpand()) return null;
				return (
					<button
						type="button"
						aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
						className="flex h-full w-full items-center justify-center p-1"
						onClick={(e) => {
							e.stopPropagation();
							row.toggleExpanded();
						}}
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 text-muted-foreground transition-transform duration-200",
								row.getIsExpanded() && "rotate-180",
							)}
						/>
					</button>
				);
			},
		};

		return [expandCol, ...columns];
	}, [isMobile, hasMobileHiddenCols, columns]);

	const table = useReactTable({
		data,
		columns: effectiveColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		globalFilterFn: globalFilterFn as FilterFn<TData>,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			globalFilter,
			pagination,
		},
		getRowCanExpand: () => isMobile && hasMobileHiddenCols,
	});

	const totalItemsPreFiltered = table.getPreFilteredRowModel().rows.length;
	const totalItems = table.getFilteredRowModel().rows.length;
	const totalPages = table.getPageCount();

	const extendedPagination = {
		...pagination,
		totalItems,
		totalPages,
	};

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{header?.(table)}
			<div className={cn("rounded-lg border overflow-x-auto")}>
				<Table className="min-w-0">
					<TableHeader className="bg-muted">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{ width: header.getSize() }}
									>
										<DataTableHeaderCell header={header} table={table} />
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						<DataTableRows
							emptyState={emptyState}
							isLoading={isLoading}
							renderSubComponent={mobileSubComponent}
							table={table}
						/>
					</TableBody>
				</Table>
			</div>
			<PaginationBar
				pagination={extendedPagination}
				onChange={setPagination}
				totalItemsPreFiltered={totalItemsPreFiltered}
			/>
		</div>
	);
}
