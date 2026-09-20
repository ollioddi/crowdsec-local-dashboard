import {
	flexRender,
	type RowData,
	type SortDirection,
	Subscribe,
} from "@tanstack/react-table";
import {
	ArrowDownNarrowWide,
	ArrowUpDown,
	ArrowUpNarrowWide,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { cn } from "@/common/lib/utils";
import type { DataTableHeader } from "./table-features";

function SortIcon({ direction }: { direction: false | SortDirection }) {
	if (direction === "asc") {
		return <ArrowUpNarrowWide className="ml-2 h-4 w-4" />;
	}
	if (direction === "desc") {
		return <ArrowDownNarrowWide className="ml-2 h-4 w-4" />;
	}
	return <ArrowUpDown className="ml-2 h-4 w-4" />;
}

// Header objects are stable, so the sort state goes through a subscription
const DataTableHeaderCell = <TData extends RowData>({
	header,
}: Readonly<{
	header: DataTableHeader<TData>;
}>) => {
	const column = header.column;
	const meta = column.columnDef.meta;
	const isMobile = useIsMobile();

	if (header.isPlaceholder) {
		return null;
	}

	// Use short mobile header if provided and on mobile, otherwise fall back to full header
	const label =
		isMobile && meta?.mobileHeader
			? meta.mobileHeader
			: flexRender(column.columnDef.header, header.getContext());

	if (!meta?.sortable) {
		return (
			<div className="flex items-center gap-1 py-2">
				<span className="font-semibold">{label}</span>
			</div>
		);
	}

	return (
		<Subscribe
			source={column.table.atoms.sorting}
			selector={() => column.getIsSorted()}
		>
			{(isSorted) => (
				<div className="flex items-center gap-1 py-2">
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
						<SortIcon direction={isSorted} />
					</Button>
				</div>
			)}
		</Subscribe>
	);
};

export default DataTableHeaderCell;
