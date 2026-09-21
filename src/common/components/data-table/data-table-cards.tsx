import { useHydrated } from "@tanstack/react-router";
import { flexRender, type RowData, Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { Button } from "@/common/components/ui/button";
import type {
	DataTableCell,
	DataTableColumnMeta,
	DataTableInstance,
	DataTableRow,
} from "./table-features";
import { columnLabel, EXPAND_COLUMN_ID } from "./table-utils";
import { useVirtualRows } from "./use-virtual-rows";

type CardRole = NonNullable<DataTableColumnMeta["card"]>;

type RenderSubComponent<TData extends RowData> = (
	row: DataTableRow<TData>,
) => ReactElement;

interface DataTableCardsProps<TData extends RowData> {
	table: DataTableInstance<TData>;
	scrollRef: RefObject<HTMLDivElement | null>;
	renderSubComponent?: RenderSubComponent<TData>;
	emptyState?: ReactNode;
}

const VIRTUALIZATION_THRESHOLD = 40;
const ESTIMATED_CARD_HEIGHT = 132;
const ESTIMATED_EXPANDED_HEIGHT = 560;
const INITIAL_CARDS_TO_RENDER = 12;
// The gap sits inside the measured element so the virtualizer counts it
const CARD_SPACING = "pb-2";

/** Mobile rendering: one card per row, laid out from the columns' card roles */
export default function DataTableCards<TData extends RowData>({
	table,
	scrollRef,
	renderSubComponent,
	emptyState,
}: Readonly<DataTableCardsProps<TData>>) {
	const hydrated = useHydrated();
	const rows = table.getRowModel().rows;

	if (rows.length === 0) {
		return (
			<div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
				{table.options.data.length === 0
					? (emptyState ?? "No results.")
					: "Nothing matches the current filters."}
			</div>
		);
	}

	if (rows.length <= VIRTUALIZATION_THRESHOLD) {
		return (
			<div className="flex flex-col">
				{rows.map((row) => (
					<div key={row.id} className={CARD_SPACING}>
						<RowCard row={row} renderSubComponent={renderSubComponent} />
					</div>
				))}
			</div>
		);
	}

	return (
		<VirtualizedCards
			hydrated={hydrated}
			renderSubComponent={renderSubComponent}
			rows={rows}
			scrollRef={scrollRef}
		/>
	);
}

const VirtualizedCards = <TData extends RowData>({
	rows,
	hydrated,
	renderSubComponent,
	scrollRef,
}: {
	rows: DataTableRow<TData>[];
	hydrated: boolean;
	renderSubComponent?: RenderSubComponent<TData>;
	scrollRef: RefObject<HTMLDivElement | null>;
}) => {
	const { anchorRef, items, measureElement, topPadding, bottomPadding } =
		useVirtualRows<HTMLDivElement, HTMLDivElement>({
			scrollRef,
			count: rows.length,
			enabled: hydrated,
			estimateSize: (index) =>
				rows[index].getIsExpanded()
					? ESTIMATED_EXPANDED_HEIGHT
					: ESTIMATED_CARD_HEIGHT,
			overscan: 6,
		});

	if (!hydrated || items.length === 0) {
		return (
			<div className="flex flex-col" ref={anchorRef}>
				{rows.slice(0, INITIAL_CARDS_TO_RENDER).map((row) => (
					<div key={row.id} className={CARD_SPACING}>
						<RowCard row={row} renderSubComponent={renderSubComponent} />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div ref={anchorRef} aria-hidden />
			{topPadding > 0 && <div style={{ height: topPadding }} aria-hidden />}
			{items.map((item) => {
				const row = rows[item.index];
				return (
					<div
						key={row.id}
						className={CARD_SPACING}
						data-index={item.index}
						ref={measureElement}
					>
						<RowCard row={row} renderSubComponent={renderSubComponent} />
					</div>
				);
			})}
			{bottomPadding > 0 && (
				<div style={{ height: bottomPadding }} aria-hidden />
			)}
		</div>
	);
};

function cardRole<TData extends RowData>(
	cell: DataTableCell<TData>,
): CardRole | null {
	const { id, columnDef } = cell.column;
	if (id === EXPAND_COLUMN_ID || columnDef.meta?.filterOnly) return null;
	if (columnDef.meta?.card) return columnDef.meta.card;
	return typeof columnDef.header === "string" && columnDef.header !== ""
		? "field"
		: "action";
}

// Row objects are stable, so the expanded flag goes through a subscription
const RowCard = <TData extends RowData>({
	row,
	renderSubComponent,
}: {
	row: DataTableRow<TData>;
	renderSubComponent?: RenderSubComponent<TData>;
}) => (
	<Subscribe
		source={row.table.store}
		selector={(state) => state.expanded === true || !!state.expanded[row.id]}
	>
		{(isExpanded) => {
			const cells = row.getAllCells();
			const byRole = (role: CardRole) =>
				cells.filter((cell) => cardRole(cell) === role);
			const render = (cell: DataTableCell<TData>) => (
				<div key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</div>
			);
			const fields = byRole("field");
			const actions = byRole("action");

			return (
				<div
					className={cn(
						"flex flex-col rounded-lg border bg-card transition-colors",
						isExpanded && "border-ring/40 bg-muted/30",
					)}
				>
					<div className="group/header relative flex items-center gap-1 rounded-t-lg pr-1 transition-colors has-[>button:hover]:bg-muted/50">
						{/* after: stretches the hit area across the header, so the hover
						    highlight and the click target are the same shape */}
						<button
							type="button"
							disabled={!renderSubComponent}
							aria-expanded={renderSubComponent ? isExpanded : undefined}
							onClick={() => row.toggleExpanded()}
							className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 self-stretch p-2.5 text-left outline-none after:absolute after:inset-0 after:rounded-t-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 disabled:pointer-events-none"
						>
							{byRole("title").map(render)}
							{byRole("badge").map(render)}
						</button>
						{/* The expanded panel repeats these as labelled buttons */}
						{!isExpanded && actions.length > 0 && (
							<div className="relative z-10 flex shrink-0 items-center">
								{actions.map(render)}
							</div>
						)}
						{renderSubComponent && (
							<Button
								variant="ghost"
								size="icon-sm"
								className="relative z-10 size-9 shrink-0 text-muted-foreground"
								aria-label={isExpanded ? "Collapse" : "Expand"}
								aria-expanded={isExpanded}
								onClick={() => row.toggleExpanded()}
							>
								<ChevronDown
									className={cn(
										"size-4 transition-transform",
										isExpanded && "rotate-180",
									)}
								/>
							</Button>
						)}
					</div>

					{fields.length > 0 && (
						<dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2.5 pb-2.5 text-sm">
							{fields.map((cell) => (
								<div key={cell.id} className="min-w-0">
									<dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
										{columnLabel(cell.column)}
									</dt>
									<dd className="min-w-0">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</dd>
								</div>
							))}
						</dl>
					)}
					{isExpanded && renderSubComponent && (
						<div className="border-t px-2.5 pb-2.5 pt-2.5">
							{renderSubComponent(row)}
						</div>
					)}
				</div>
			);
		}}
	</Subscribe>
);
