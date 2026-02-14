"use no memo";
import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FacetedFilterProps<TData, TValue> {
	column: Column<TData, TValue>;
	title: string;
	/** Pass the current filter value explicitly to trigger re-renders (column ref is stable) */
	filterValue?: string[];
}

export function FacetedFilter<TData, TValue>({
	column,
	title,
	filterValue: filterValueProp,
}: Readonly<FacetedFilterProps<TData, TValue>>) {
	const facetedValues = column.getFacetedUniqueValues();
	const filterValue =
		filterValueProp ?? (column.getFilterValue() as string[]) ?? [];

	const options = useMemo(
		() =>
			Array.from(facetedValues.keys())
				.filter((v) => v != null && String(v) !== "")
				.map((value) => ({
					label: String(value),
					count: facetedValues.get(value) ?? 0,
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),
		[facetedValues],
	);

	const selectedSet = new Set(filterValue);

	const handleSelect = (value: string) => {
		const next = new Set(selectedSet);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		const values = Array.from(next);
		column.setFilterValue(values.length > 0 ? values : undefined);
	};

	const handleClear = () => column.setFilterValue(undefined);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 border-dashed">
					<PlusCircle className="mr-2 size-4" />
					{title}
					{selectedSet.size > 0 && (
						<>
							<Separator orientation="vertical" className="mx-2 h-4" />
							<Badge
								variant="secondary"
								className="rounded-sm px-1 font-normal lg:hidden"
							>
								{selectedSet.size}
							</Badge>
							<div className="hidden space-x-1 lg:flex">
								{selectedSet.size > 2 ? (
									<Badge
										variant="secondary"
										className="rounded-sm px-1 font-normal"
									>
										{selectedSet.size} selected
									</Badge>
								) : (
									Array.from(selectedSet).map((value) => (
										<Badge
											key={value}
											variant="secondary"
											className="rounded-sm px-1 font-normal"
										>
											{value}
										</Badge>
									))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0" align="start">
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedSet.has(option.label);
								return (
									<CommandItem
										key={option.label}
										value={option.label}
										onSelect={() => handleSelect(option.label)}
									>
										<div
											className={cn(
												"mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
												isSelected
													? "bg-primary text-primary-foreground"
													: "opacity-50 [&_svg]:invisible",
											)}
										>
											<Check className="size-3" />
										</div>
										<span>{option.label}</span>
										<span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
											{option.count}
										</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedSet.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={handleClear}
										className="justify-center text-center"
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
