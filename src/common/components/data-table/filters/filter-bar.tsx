import type { RowData } from "@tanstack/react-table";
import { ListFilter, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/common/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/common/components/ui/popover";
import type { DataTableColumn, DataTableInstance } from "../table-features";
import { columnLabel } from "../table-utils";
import { FilterEditor } from "./filter-editor";
import { describeFilter, type FilterValue } from "./filter-operators";

/**
 * Active filters as chips (click to edit, x to remove) plus one "Filter"
 * button that picks a column and then opens its editor.
 */
export function FilterBar<TData extends RowData>({
	table,
}: Readonly<{ table: DataTableInstance<TData> }>) {
	const filterable = table
		.getAllLeafColumns()
		.filter((col) => col.columnDef.meta?.filter);
	const active = table.state.columnFilters.flatMap((filter) => {
		const column = filterable.find((col) => col.id === filter.id);
		return column ? [{ column, value: filter.value as FilterValue }] : [];
	});

	if (filterable.length === 0) return null;

	return (
		<>
			{active.map(({ column, value }) => (
				<FilterChip key={column.id} column={column} value={value} />
			))}
			<AddFilter columns={filterable} />
		</>
	);
}

function FilterChip<TData extends RowData>({
	column,
	value,
}: Readonly<{ column: DataTableColumn<TData>; value: FilterValue }>) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="flex h-8 max-w-full shrink-0 items-center rounded-md border border-primary/40 bg-primary/5 text-xs">
				<PopoverTrigger asChild>
					<button
						type="button"
						className="flex min-w-0 items-center gap-1 px-2 py-1 hover:bg-primary/10"
					>
						<span className="font-medium">{columnLabel(column)}</span>
						<span className="truncate text-muted-foreground">
							{describeFilter(value)}
						</span>
					</button>
				</PopoverTrigger>
				<button
					type="button"
					aria-label={`Remove ${columnLabel(column)} filter`}
					className="flex h-full items-center border-l border-primary/30 px-1.5 hover:bg-primary/10"
					onClick={() => column.setFilterValue(undefined)}
				>
					<X className="size-3" />
				</button>
			</div>
			<PopoverContent align="start" className="w-auto p-0">
				<FilterEditor
					column={column}
					active={value}
					onApply={(next) => {
						column.setFilterValue(next);
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

function AddFilter<TData extends RowData>({
	columns,
}: Readonly<{ columns: DataTableColumn<TData>[] }>) {
	const [open, setOpen] = useState(false);
	const [column, setColumn] = useState<DataTableColumn<TData> | null>(null);

	const onOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setColumn(null);
	};

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 border-dashed">
					{column ? (
						<ListFilter className="size-3.5" />
					) : (
						<Plus className="size-3.5" />
					)}
					Filter
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				{column ? (
					<FilterEditor
						column={column}
						active={column.getFilterValue() as FilterValue | undefined}
						onApply={(next) => {
							column.setFilterValue(next);
							onOpenChange(false);
						}}
					/>
				) : (
					<Command className="w-48">
						<CommandList>
							<CommandGroup heading="Filter by">
								{columns.map((col) => (
									<CommandItem
										key={col.id}
										value={col.id}
										onSelect={() => setColumn(col)}
									>
										{columnLabel(col)}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				)}
			</PopoverContent>
		</Popover>
	);
}
