import { Check, PlusCircle } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/common/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/common/components/ui/popover";
import { Separator } from "@/common/components/ui/separator";
import { cn } from "@/common/lib/utils";

export interface FacetedOption {
	label: string;
	count: number;
}

interface FacetedFilterProps {
	title: string;
	options: FacetedOption[];
	selected: string[];
	onChange: (values: string[]) => void;
}

export function FacetedFilter({
	title,
	options,
	selected,
	onChange,
}: Readonly<FacetedFilterProps>) {
	const selectedSet = new Set(selected);

	const handleSelect = (value: string) => {
		const next = new Set(selectedSet);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		onChange(Array.from(next));
	};

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
										onSelect={() => onChange([])}
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
