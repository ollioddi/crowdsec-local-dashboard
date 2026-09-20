import type { RowData } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/common/components/ui/command";
import { Input } from "@/common/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/common/components/ui/select";
import { Separator } from "@/common/components/ui/separator";
import { cn } from "@/common/lib/utils";
import type { DataTableColumn } from "../table-features";
import { columnLabel } from "../table-utils";
import {
	dateOperators,
	type FilterOperator,
	type FilterType,
	type FilterValue,
	numberOperators,
	operatorLabels,
	selectOperators,
	textOperators,
} from "./filter-operators";

const operatorsByType: Record<
	FilterType,
	{ operators: readonly FilterOperator[]; defaultOperator: FilterOperator }
> = {
	text: { operators: textOperators, defaultOperator: "contains" },
	select: { operators: selectOperators, defaultOperator: "isAnyOf" },
	number: { operators: numberOperators, defaultOperator: "gte" },
	date: { operators: dateOperators, defaultOperator: "onOrAfter" },
};

function isComplete(operator: FilterOperator, value: string | string[]) {
	if (operator === "isEmpty") return true;
	if (operator === "between") {
		return Array.isArray(value) && value.length === 2 && value.every(Boolean);
	}
	return Array.isArray(value) ? value.length > 0 : value.trim() !== "";
}

interface FilterEditorProps<TData extends RowData> {
	column: DataTableColumn<TData>;
	active: FilterValue | undefined;
	onApply: (value: FilterValue | undefined) => void;
}

/**
 * Operator select plus the value input for one column. The draft is local
 * until Apply, so typing never touches the URL.
 */
export function FilterEditor<TData extends RowData>({
	column,
	active,
	onApply,
}: Readonly<FilterEditorProps<TData>>) {
	const type = column.columnDef.meta?.filter ?? "text";
	const { operators, defaultOperator } = operatorsByType[type];
	const [operator, setOperator] = useState<FilterOperator>(
		active?.operator ?? defaultOperator,
	);
	const [value, setValue] = useState<string | string[]>(active?.value ?? "");

	const apply = () =>
		onApply(isComplete(operator, value) ? { operator, value } : undefined);
	const onEnter = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") apply();
	};

	return (
		<div className="w-72">
			<p className="px-3 pt-3 pb-2 text-sm font-medium">
				Filter {columnLabel(column)}
			</p>
			<Separator />
			<div className="flex flex-col gap-3 p-3">
				<Select
					value={operator}
					onValueChange={(next) => setOperator(next as FilterOperator)}
				>
					<SelectTrigger className="h-8 w-full text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{operators.map((op) => (
							<SelectItem key={op} value={op} className="text-xs">
								{operatorLabels[op]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{type === "text" && operator !== "isEmpty" && (
					<Input
						autoFocus
						className="h-8 text-xs"
						placeholder="Value…"
						value={String(value)}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={onEnter}
					/>
				)}
				{type === "number" && (
					<Input
						autoFocus
						type="number"
						inputMode="numeric"
						className="h-8 text-xs"
						placeholder="Value…"
						value={String(value)}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={onEnter}
					/>
				)}
				{type === "date" && operator === "between" && (
					<DateRange value={value} onChange={setValue} onEnter={onEnter} />
				)}
				{type === "date" && operator !== "between" && (
					<Input
						type="date"
						className="h-8 text-xs"
						value={Array.isArray(value) ? "" : value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={onEnter}
					/>
				)}
				{type === "select" && (
					<FacetPicker column={column} value={value} onChange={setValue} />
				)}
			</div>
			<Separator />
			<div className="flex items-center justify-between p-3">
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs"
					disabled={!active}
					onClick={() => onApply(undefined)}
				>
					<X className="size-3" />
					Remove
				</Button>
				<Button
					size="sm"
					className="h-7 px-3 text-xs"
					disabled={!isComplete(operator, value)}
					onClick={apply}
				>
					Apply
				</Button>
			</div>
		</div>
	);
}

function DateRange({
	value,
	onChange,
	onEnter,
}: Readonly<{
	value: string | string[];
	onChange: (value: string[]) => void;
	onEnter: (e: React.KeyboardEvent) => void;
}>) {
	const [start = "", end = ""] = Array.isArray(value) ? value : [];
	return (
		<div className="flex flex-col gap-2">
			<Input
				type="date"
				className="h-8 text-xs"
				value={start}
				onChange={(e) => onChange([e.target.value, end])}
			/>
			<Input
				type="date"
				className="h-8 text-xs"
				value={end}
				onChange={(e) => onChange([start, e.target.value])}
				onKeyDown={onEnter}
			/>
		</div>
	);
}

/** Multi-select over the column's faceted values, with counts */
function FacetPicker<TData extends RowData>({
	column,
	value,
	onChange,
}: Readonly<{
	column: DataTableColumn<TData>;
	value: string | string[];
	onChange: (value: string[]) => void;
}>) {
	const selected = new Set(Array.isArray(value) ? value : []);
	const options = Array.from(column.getFacetedUniqueValues().entries())
		.filter(([option]) => option != null && String(option) !== "")
		.map(([option, count]) => ({ value: String(option), count }))
		.sort((a, b) => a.value.localeCompare(b.value));

	const toggle = (option: string) => {
		const next = new Set(selected);
		if (next.has(option)) {
			next.delete(option);
		} else {
			next.add(option);
		}
		onChange(Array.from(next));
	};

	return (
		<Command className="rounded-md border">
			<CommandInput placeholder="Search…" className="h-8 text-xs" />
			<CommandList className="max-h-56">
				<CommandEmpty>No values.</CommandEmpty>
				<CommandGroup>
					{options.map((option) => (
						<CommandItem
							key={option.value}
							value={option.value}
							onSelect={() => toggle(option.value)}
							className="text-xs"
						>
							<div
								className={cn(
									"mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
									selected.has(option.value)
										? "bg-primary text-primary-foreground"
										: "opacity-50 [&_svg]:invisible",
								)}
							>
								<Check className="size-3" />
							</div>
							<span className="truncate">{option.value}</span>
							<span className="ml-auto font-mono text-muted-foreground">
								{option.count}
							</span>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
