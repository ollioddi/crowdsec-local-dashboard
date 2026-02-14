import type { PaginationState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { type FC, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { calculatePages, type PageElement } from "./table-utils";

// --- Types ---

export interface ExtendedPagination {
	pageIndex: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

// --- Constants ---

const DEFAULT_PAGE_PRESETS = [5, 10, 25, 50, 100, 250, 500, 1000];
const SCROLL_THRESHOLD = 600;

// --- Helper functions ---

function getAdjustedPageSizes(totalItems: number, presets: number[]): number[] {
	return presets.filter((size) => size < totalItems);
}

function calculateItemRange(
	pageIndex: number,
	pageSize: number,
	totalItems: number,
): { first: number; last: number } {
	return {
		first: totalItems > 0 ? pageIndex * pageSize + 1 : 0,
		last: Math.min((pageIndex + 1) * pageSize, totalItems),
	};
}

// --- Sub-components ---

interface ItemCountDisplayProps {
	itemRange: { first: number; last: number };
	totalItems: number;
	totalItemsPreFiltered: number;
}

function ItemCountDisplay({
	itemRange,
	totalItems,
	totalItemsPreFiltered,
}: Readonly<ItemCountDisplayProps>) {
	const bold = (value: ReactNode) => (
		<span style={{ fontWeight: "bold" }}>{value}</span>
	);

	const isFiltered =
		totalItemsPreFiltered !== 0 && totalItemsPreFiltered !== totalItems;

	if (isFiltered) {
		return (
			<div className="text-muted-foreground text-sm">
				{bold(itemRange.first)}-{bold(itemRange.last)}{" "}
				<span className="text-muted-foreground"> of </span>
				{bold(totalItems)} <span> (filtered) </span> of{" "}
				{bold(totalItemsPreFiltered)} items
			</div>
		);
	}

	return (
		<div className="text-muted-foreground text-sm">
			{bold(itemRange.first)}-{bold(itemRange.last)}{" "}
			<span className="text-muted-foreground"> of </span>
			{bold(totalItems)} items
		</div>
	);
}

interface PageSizeSelectorProps {
	pageSize: number;
	adjustedPageSizes: number[];
	totalItems: number;
	isTotalItemsPreset: boolean;
	onPageSizeChange: (newPageSize: string) => void;
}

function PageSizeSelector({
	pageSize,
	adjustedPageSizes,
	totalItems,
	isTotalItemsPreset,
	onPageSizeChange,
}: Readonly<PageSizeSelectorProps>) {
	return (
		<div className="flex items-center gap-x-2">
			<p className="hidden font-medium text-sm sm:block">Rows per page</p>
			<Select onValueChange={onPageSizeChange} value={String(pageSize)}>
				<SelectTrigger className="w-20" size="sm">
					<SelectValue>{pageSize}</SelectValue>
				</SelectTrigger>
				<SelectContent position="popper" sideOffset={4}>
					{adjustedPageSizes.map((size) => (
						<SelectItem key={size} value={String(size)}>
							{size}
						</SelectItem>
					))}
					{!isTotalItemsPreset && totalItems > 0 && (
						<SelectItem value={String(totalItems)}>
							All ({totalItems})
						</SelectItem>
					)}
				</SelectContent>
			</Select>
		</div>
	);
}

interface PageNavigationProps {
	pageIndex: number;
	totalPages: number;
	pageNumbers: PageElement[];
	canGoBack: boolean;
	canGoForward: boolean;
	onPageChange: (page: number) => void;
}

const ACTIVE_PAGE_CLASS =
	"bg-primary-surface-default text-greyscale-text-negative hover:bg-primary-surface-lighter hover:text-greyscale-text-caption focus-visible:ring-primary-border-subtle";

function PageNavigation({
	pageIndex,
	totalPages,
	pageNumbers,
	canGoBack,
	canGoForward,
	onPageChange,
}: Readonly<PageNavigationProps>) {
	return (
		<Pagination className="mx-0 w-auto">
			<PaginationContent>
				<PaginationItem>
					<Button
						className="h-10 w-10 px-0 sm:h-8 sm:w-8"
						disabled={!canGoBack}
						onClick={() => onPageChange(pageIndex - 1)}
						variant="outline"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				</PaginationItem>

				{/* Page number pills — hidden on mobile */}
				<span className="hidden sm:contents">
					{pageNumbers.map((page, index) =>
						page === "..." ? (
							<PaginationEllipsis key={`ellipsis-${page + index}`} />
						) : (
							<PaginationItem key={`page-${page}`}>
								<PaginationLink
									className={pageIndex === page ? ACTIVE_PAGE_CLASS : ""}
									isActive={pageIndex === page}
									onClick={() => onPageChange(page)}
								>
									{page + 1}
								</PaginationLink>
							</PaginationItem>
						),
					)}
				</span>

				{/* Compact "X / Y" indicator — visible only on mobile */}
				<span className="px-2 text-sm sm:hidden">
					{pageIndex + 1} / {totalPages}
				</span>

				<PaginationItem>
					<Button
						className="h-10 w-10 px-0 sm:h-8 sm:w-8"
						disabled={!canGoForward}
						onClick={() => onPageChange(pageIndex + 1)}
						variant="outline"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

interface ScrollToTopButtonProps {
	visible: boolean;
}

function ScrollToTopButton({ visible }: Readonly<ScrollToTopButtonProps>) {
	if (!visible) {
		return null;
	}

	const scrollToTop = () => {
		window.scrollTo({ behavior: "smooth", top: 0 });
	};

	return (
		<Button
			className="hidden lg:flex"
			onClick={scrollToTop}
			size="sm"
			variant="outline"
		>
			Scroll to top <ChevronUp className="ml-2 h-4 w-4" />
		</Button>
	);
}

// --- Hooks ---

function useScrollVisibility(threshold: number): boolean {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setVisible(window.scrollY > threshold);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [threshold]);

	return visible;
}

function usePageNumbers(pageIndex: number, totalPages: number): PageElement[] {
	const [pageNumbers, setPageNumbers] = useState<PageElement[]>([]);

	useEffect(() => {
		setPageNumbers(totalPages > 0 ? calculatePages(pageIndex, totalPages) : []);
	}, [pageIndex, totalPages]);

	return pageNumbers;
}

// --- Main Component ---

interface PaginationBarProperties {
	pagination: ExtendedPagination;
	onChange: (pagination: PaginationState) => void;
	pageSizePresets?: number[];
	totalItemsPreFiltered?: number;
	header?: ReactNode;
}

export const PaginationBar: FC<PaginationBarProperties> = ({
	pagination,
	onChange,
	pageSizePresets = DEFAULT_PAGE_PRESETS,
	totalItemsPreFiltered = 0,
	header,
}) => {
	const { pageIndex, pageSize, totalItems, totalPages } = pagination;

	// Hooks
	const pageNumbers = usePageNumbers(pageIndex, totalPages);
	const showScrollToTop = useScrollVisibility(SCROLL_THRESHOLD);

	// Derived values
	const adjustedPageSizes = getAdjustedPageSizes(totalItems, pageSizePresets);
	const isTotalItemsPreset = pageSizePresets.includes(totalItems);
	const itemRange = calculateItemRange(pageIndex, pageSize, totalItems);
	const canGoBack = pageIndex > 0;
	const canGoForward = pageIndex < totalPages - 1;

	// Handlers
	const handlePageChange = (page: number) => {
		if (page !== pageIndex) {
			onChange({ pageIndex: page, pageSize });
		}
	};

	const handlePageSizeChange = (newPageSize: string) => {
		onChange({ pageIndex, pageSize: Number(newPageSize) });
	};

	return (
		<div className="sticky bottom-0 z-20 w-full bg-background">
			{header}
			{/* Mobile: two rows. Desktop: single row. */}
			<div className="flex w-full flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
				{/* Row 1 (mobile) / left side (desktop): item count + page size */}
				<div className="flex items-center justify-between gap-x-4 sm:justify-start">
					<ItemCountDisplay
						itemRange={itemRange}
						totalItems={totalItems}
						totalItemsPreFiltered={totalItemsPreFiltered}
					/>
					<PageSizeSelector
						adjustedPageSizes={adjustedPageSizes}
						isTotalItemsPreset={isTotalItemsPreset}
						onPageSizeChange={handlePageSizeChange}
						pageSize={pageSize}
						totalItems={totalItems}
					/>
				</div>

				{/* Row 2 (mobile) / right side (desktop): navigation + scroll to top */}
				<div className="flex items-center justify-center gap-x-4 sm:justify-end sm:gap-x-6 lg:gap-x-8">
					<PageNavigation
						canGoBack={canGoBack}
						canGoForward={canGoForward}
						onPageChange={handlePageChange}
						pageIndex={pageIndex}
						pageNumbers={pageNumbers}
						totalPages={totalPages}
					/>

					<ScrollToTopButton visible={showScrollToTop} />
				</div>
			</div>
		</div>
	);
};

export default PaginationBar;
