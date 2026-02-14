"use no memo";
import {
	flexRender,
	type Header,
	type Table as ReactTableType,
} from "@tanstack/react-table";
import {
	ArrowDownNarrowWide,
	ArrowUpDown,
	ArrowUpNarrowWide,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// This component is used to render the header cell of a data table
const DataTableHeaderCell = <TData,>({
	header,
}: Readonly<{
	header: Header<TData, unknown>;
	table: ReactTableType<TData>;
}>) => {
	const column = header.column;
	const meta = column.columnDef.meta;
	const isSorted = column.getIsSorted();
	const isMobile = useIsMobile();

	if (header.isPlaceholder) {
		return null;
	}

	// Use short mobile header if provided and on mobile, otherwise fall back to full header
	const label =
		isMobile && meta?.mobileHeader
			? meta.mobileHeader
			: flexRender(column.columnDef.header, header.getContext());

	// Determine which icon to show based on sort state
	const getSortIcon = () => {
		if (isSorted === "asc") {
			return <ArrowUpNarrowWide className="ml-2 h-4 w-4" />;
		}
		if (isSorted === "desc") {
			return <ArrowDownNarrowWide className="ml-2 h-4 w-4" />;
		}
		return <ArrowUpDown className="ml-2 h-4 w-4" />;
	};

	return (
		<div className="flex items-center gap-1 py-2">
			{(meta?.sortable ?? false) ? (
				<Button
					className={cn(
						"flex items-center hover:border-2 hover:shadow-sm",
						isSorted &&
							"bg-background shadow-sm dark:border-input dark:bg-input/30",
					)}
					onClick={() => {
						column.toggleSorting(isSorted === "asc");
					}}
					variant="ghost"
				>
					<span className="font-semibold">{label}</span>
					{getSortIcon()}
				</Button>
			) : (
				<span className="font-semibold">{label}</span>
			)}
		</div>
	);
};

export default DataTableHeaderCell;
