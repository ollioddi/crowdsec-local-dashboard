import { useHydrated } from "@tanstack/react-router";
import { flexRender, type RowData, Subscribe } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils";
import type {
	DataTableCell,
	DataTableColumnMeta,
	DataTableInstance,
	DataTableRow,
} from "./table-features";
import { columnLabel, EXPAND_COLUMN_ID } from "./table-utils";
import { useWindowVirtual } from "./use-window-virtual";

type CardRole = NonNullable<DataTableColumnMeta["card"]>;

type RenderSubComponent<TData extends RowData> = (
	row: DataTableRow<TData>,
) => ReactElement;

interface DataTableCardsProps<TData extends RowData> {
	table: DataTableInstance<TData>;
	renderSubComponent?: RenderSubComponent<TData>;
	emptyState?: ReactNode;
}

const VIRTUALIZATION_THRESHOLD = 40;
const ESTIMATED_CARD_HEIGHT = 190;
const ESTIMATED_EXPANDED_HEIGHT = 640;
const INITIAL_CARDS_TO_RENDER = 12;
// The gap sits inside the measured element so the virtualizer counts it
const CARD_SPACING = "pb-3";

/** Mobile rendering: one card per row, laid out from the columns' card roles */
export default function DataTableCards<TData extends RowData>({
	table,
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
		/>
	);
}

const VirtualizedCards = <TData extends RowData>({
	rows,
	hydrated,
	renderSubComponent,
}: {
	rows: DataTableRow<TData>[];
	hydrated: boolean;
	renderSubComponent?: RenderSubComponent<TData>;
}) => {
	const { anchorRef, items, measureElement, topPadding, bottomPadding } =
		useWindowVirtual<HTMLDivElement>({
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
				<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
					<div className="flex items-start gap-2">
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
							{byRole("title").map(render)}
							{byRole("badge").map(render)}
						</div>
						{renderSubComponent && (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={isExpanded ? "Collapse" : "Expand"}
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
						<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							{fields.map((cell) => (
								<div key={cell.id} className="min-w-0">
									<dt className="text-xs text-muted-foreground">
										{columnLabel(cell.column)}
									</dt>
									<dd className="min-w-0">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</dd>
								</div>
							))}
						</dl>
					)}
					{actions.length > 0 && (
						<div className="flex flex-wrap gap-2">{actions.map(render)}</div>
					)}
					{isExpanded && renderSubComponent && (
						<div className="border-t pt-3">{renderSubComponent(row)}</div>
					)}
				</div>
			);
		}}
	</Subscribe>
);
