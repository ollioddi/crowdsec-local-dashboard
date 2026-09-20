import type { RowData } from "@tanstack/react-table";
import {
	ArrowDownNarrowWide,
	ArrowUpDown,
	ArrowUpNarrowWide,
	Check,
	RotateCcw,
	Search,
	Settings2,
	X,
} from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { Input } from "@/common/components/ui/input";
import { FilterBar } from "./filters/filter-bar";
import type { DataTableInstance } from "./table-features";
import { columnLabel, getDefaultColumnVisibility } from "./table-utils";

interface DataTableToolbarProps<TData extends RowData> {
	table: DataTableInstance<TData>;
	searchPlaceholder?: string;
	showColumnSelector: boolean;
	onResetFilters: () => void;
}

export default function DataTableToolbar<TData extends RowData>({
	table,
	searchPlaceholder = "Search…",
	showColumnSelector,
	onResetFilters,
}: Readonly<DataTableToolbarProps<TData>>) {
	const query = (table.state.globalFilter as string | undefined) ?? "";
	const columnFilters = table.state.columnFilters;
	const hasFilters = columnFilters.length > 0 || query !== "";

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="relative basis-full sm:basis-auto sm:w-64">
				<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="h-8 pl-8 pr-8"
					placeholder={searchPlaceholder}
					value={query}
					onChange={(e) => table.setGlobalFilter(e.target.value)}
				/>
				{query && (
					<Button
						variant="ghost"
						size="icon-xs"
						className="absolute right-1 top-1/2 -translate-y-1/2"
						onClick={() => table.setGlobalFilter("")}
					>
						<X className="size-3" />
					</Button>
				)}
			</div>

			<FilterBar table={table} />

			{hasFilters && (
				<Button
					variant="ghost"
					size="sm"
					className="h-8 px-2"
					onClick={onResetFilters}
				>
					Clear
					<X className="size-3.5" />
				</Button>
			)}

			<div className="ml-auto flex items-center gap-2">
				<SortMenu table={table} />
				{showColumnSelector && <ColumnSelector table={table} />}
			</div>
		</div>
	);
}

function SortMenu<TData extends RowData>({
	table,
}: Readonly<{ table: DataTableInstance<TData> }>) {
	const sortable = table
		.getAllLeafColumns()
		.filter((col) => col.columnDef.meta?.sortable);
	const [current] = table.state.sorting;
	const currentColumn = sortable.find((col) => col.id === current?.id);
	if (sortable.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<ArrowUpDown className="size-4" />
					<span className="hidden sm:inline">
						{currentColumn ? columnLabel(currentColumn) : "Sort"}
					</span>
					{current &&
						(current.desc ? (
							<ArrowDownNarrowWide className="size-3.5" />
						) : (
							<ArrowUpNarrowWide className="size-3.5" />
						))}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel>Sort by</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{sortable.map((column) => {
					const isCurrent = column.id === current?.id;
					return (
						<DropdownMenuItem
							key={column.id}
							onSelect={() => column.toggleSorting(isCurrent && !current.desc)}
						>
							<Check className={isCurrent ? "size-4" : "size-4 opacity-0"} />
							{columnLabel(column)}
							{isCurrent && (
								<span className="ml-auto text-xs text-muted-foreground">
									{current.desc ? "desc" : "asc"}
								</span>
							)}
						</DropdownMenuItem>
					);
				})}
				{current && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => table.resetSorting(true)}>
							<X className="size-4" />
							Clear sort
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ColumnSelector<TData extends RowData>({
	table,
}: Readonly<{ table: DataTableInstance<TData> }>) {
	const columns = table
		.getAllLeafColumns()
		.filter(
			(col) =>
				col.accessorFn !== undefined &&
				col.getCanHide() &&
				!col.columnDef.meta?.filterOnly,
		);
	const defaults = getDefaultColumnVisibility(columns.map((c) => c.columnDef));
	const isAtDefault = columns.every(
		(col) => col.getIsVisible() === (defaults[col.id] ?? true),
	);
	const hiddenCount = columns.filter((col) => !col.getIsVisible()).length;
	if (columns.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<Settings2 className="size-4" />
					<span>Columns</span>
					{hiddenCount > 0 && (
						<Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
							{hiddenCount} hidden
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Columns</span>
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-1 text-xs text-muted-foreground"
						disabled={isAtDefault}
						onClick={() => table.setColumnVisibility(defaults)}
					>
						<RotateCcw className="size-3" />
						Reset
					</Button>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => (
					<DropdownMenuCheckboxItem
						key={column.id}
						checked={column.getIsVisible()}
						onCheckedChange={() => column.toggleVisibility()}
					>
						{columnLabel(column)}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
