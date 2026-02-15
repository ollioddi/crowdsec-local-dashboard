"use no memo";
import type { Column, Table } from "@tanstack/react-table";
import { RotateCcw, Search, Settings2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { FacetedFilter } from "./faceted-filter";
import { getDefaultColumnVisibility } from "./table-utils";

export interface DataDisplayToolbarProps<TData> {
	/** TanStack Table instance */
	table: Table<TData>;
	className?: string;
	/** Placeholder text for the global search input */
	searchPlaceholder?: string;
	/** Extra content rendered to the right of the search bar */
	extra?: ReactNode;
}

/* ------------------------------ Global search ----------------------------- */
const GlobalSearch = <TData,>({
	table,
	placeholder = "Search…",
}: {
	table: Table<TData>;
	placeholder?: string;
}) => {
	const value = (table.getState().globalFilter as string) ?? "";

	return (
		<div className="relative w-full sm:max-w-sm">
			<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				className="pl-8 pr-8"
				placeholder={placeholder}
				value={value}
				onChange={(e) => table.setGlobalFilter(e.target.value)}
			/>
			{value && (
				<Button
					variant="ghost"
					size="icon"
					className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
					onClick={() => table.setGlobalFilter("")}
				>
					<X className="size-3" />
				</Button>
			)}
		</div>
	);
};

/* --------------------------- Column visibility ---------------------------- */
const ColumnVisibility = <TData,>({
	columns,
}: {
	columns: Column<TData>[];
}) => {
	const isMobile = useIsMobile();
	const defaults = getDefaultColumnVisibility(
		columns.map((c) => c.columnDef),
		isMobile,
	);
	const isAtDefault = columns.every(
		(col) => col.getIsVisible() === (defaults[col.id] ?? true),
	);
	const visibleColumns = columns.filter((col) => col.getIsVisible());
	const hiddenCount = columns.length - visibleColumns.length;

	const toggleColumn = (column: Column<TData>) => {
		column.toggleVisibility();
	};

	const resetVisibility = () => {
		for (const col of columns) {
			col.toggleVisibility(defaults[col.id] ?? true);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="gap-2 bg-transparent lg:flex"
					size="sm"
					variant="outline"
				>
					<Settings2 className="size-4" />
					<span>Columns</span>
					{hiddenCount > 0 && (
						<Badge className="ml-1 px-1.5 py-0 text-xs" variant="secondary">
							{hiddenCount} hidden
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Hide columns</span>
					<Button
						className="ml-2 h-auto p-1 text-muted-foreground text-xs hover:text-foreground"
						disabled={isAtDefault}
						onClick={resetVisibility}
						size="sm"
						variant="ghost"
					>
						<RotateCcw className="mr-1 size-3" />
						Reset
					</Button>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => {
					const label =
						typeof column.columnDef.header === "string"
							? column.columnDef.header
							: column.id;

					return (
						<DropdownMenuCheckboxItem
							checked={column.getIsVisible()}
							key={column.id}
							onCheckedChange={() => {
								toggleColumn(column);
							}}
						>
							{label}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

/* -------------------------------------------------------------------------- */
/*                                   Toolbar                                  */
/* -------------------------------------------------------------------------- */
const DataDisplayToolbar = <TData,>({
	table,
	className = "",
	searchPlaceholder,
	extra,
}: Readonly<DataDisplayToolbarProps<TData>>) => {
	// Get toggleable columns (have accessor and can hide)
	const toggleableColumns = table
		.getAllColumns()
		.filter((col) => col.accessorFn !== undefined && col.getCanHide());

	const showColumnToggler = toggleableColumns.length > 0;

	// Get columns with faceted filter variant
	const facetedColumns = table
		.getAllColumns()
		.filter((col) => col.columnDef.meta?.filterVariant === "select");

	const columnFilters = table.getState().columnFilters;
	const isFiltered = columnFilters.length > 0;

	return (
		<div className={`flex flex-wrap items-center gap-3 ${className}`}>
			{/* basis-full forces search onto its own row on mobile; sm+ it shrinks back inline */}
			<div className="basis-full sm:basis-auto">
				<GlobalSearch table={table} placeholder={searchPlaceholder} />
			</div>

			{/* Faceted filters */}
			{facetedColumns.map((column) => {
				const label =
					typeof column.columnDef.header === "string"
						? column.columnDef.header
						: column.id;
				const currentFilter = columnFilters.find((f) => f.id === column.id);
				return (
					<FacetedFilter
						key={column.id}
						column={column}
						title={label}
						filterValue={(currentFilter?.value as string[]) ?? []}
					/>
				);
			})}

			{isFiltered && (
				<Button
					variant="ghost"
					size="sm"
					className="h-8 px-2 lg:px-3"
					onClick={() => table.resetColumnFilters()}
				>
					Reset
					<X className="ml-2 size-4" />
				</Button>
			)}

			{/* Right section — forced to its own row on mobile */}
			<div className="flex basis-full items-center justify-between gap-3 sm:basis-auto sm:ml-auto sm:shrink-0 sm:justify-end">
				{showColumnToggler && <ColumnVisibility columns={toggleableColumns} />}
				{extra}
			</div>
		</div>
	);
};

export default DataDisplayToolbar;
