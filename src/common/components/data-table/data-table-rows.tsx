import { useHydrated } from "@tanstack/react-router";
import { flexRender, type RowData, Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import type { ReactElement, ReactNode, RefObject } from "react";
import { TableBody, TableCell, TableRow } from "@/common/components/ui/table";
import type { DataTableInstance, DataTableRow } from "./table-features";
import { isActionColumn } from "./table-utils";
import { useVirtualRows } from "./use-virtual-rows";

type RenderSubComponent<TData extends RowData> = (
	row: DataTableRow<TData>,
) => ReactElement;

interface DataTableRowsProps<TData extends RowData> {
	table: DataTableInstance<TData>;
	scrollRef: RefObject<HTMLDivElement | null>;
	emptyState?: ReactNode;
	renderSubComponent?: RenderSubComponent<TData>;
}

const VIRTUALIZATION_THRESHOLD = 100;
const ESTIMATED_ROW_HEIGHT = 53;
const ESTIMATED_EXPANDED_HEIGHT = 400;
const INITIAL_ROWS_TO_RENDER = 30;

/** Keeps the last row's separator in both paths, so 50 and 500 rows match. */
const KEEP_LAST_BORDER =
	"[&_tr:last-child>*]:shadow-[inset_0_-1px_0_var(--border)]";

/** The table body: one <tbody> for small pages, virtualized groups for large ones */
const DataTableRows = <TData extends RowData>({
	table,
	scrollRef,
	emptyState,
	renderSubComponent,
}: Readonly<DataTableRowsProps<TData>>) => {
	const columnsLength = table.getVisibleLeafColumns().length;
	const hydrated = useHydrated();

	if (table.options.data.length === 0) {
		return (
			<TableBody>
				<TableRow>
					<TableCell className="h-24 text-center" colSpan={columnsLength}>
						{emptyState ?? "No results."}
					</TableCell>
				</TableRow>
			</TableBody>
		);
	}

	const rows = table.getRowModel().rows;

	if (rows.length <= VIRTUALIZATION_THRESHOLD) {
		return (
			<TableBody className={KEEP_LAST_BORDER}>
				{rows.map((row) => (
					<TableRowWithExpansion
						key={row.id}
						renderSubComponent={renderSubComponent}
						row={row}
					/>
				))}
			</TableBody>
		);
	}

	return (
		<VirtualizedRows
			columnsLength={columnsLength}
			hydrated={hydrated}
			renderSubComponent={renderSubComponent}
			rows={rows}
			scrollRef={scrollRef}
		/>
	);
};

// Virtualized Rows

const VirtualizedRows = <TData extends RowData>({
	rows,
	columnsLength,
	hydrated,
	renderSubComponent,
	scrollRef,
}: {
	rows: DataTableRow<TData>[];
	columnsLength: number;
	hydrated: boolean;
	renderSubComponent?: RenderSubComponent<TData>;
	scrollRef: RefObject<HTMLDivElement | null>;
}) => {
	const { anchorRef, items, measureElement, topPadding, bottomPadding } =
		useVirtualRows<HTMLTableSectionElement, HTMLDivElement>({
			scrollRef,
			count: rows.length,
			enabled: hydrated,
			estimateSize: (index) =>
				rows[index].getIsExpanded()
					? ESTIMATED_EXPANDED_HEIGHT
					: ESTIMATED_ROW_HEIGHT,
			overscan: 15,
		});

	if (!hydrated || items.length === 0) {
		return (
			<TableBody ref={anchorRef} className={KEEP_LAST_BORDER}>
				{rows.slice(0, INITIAL_ROWS_TO_RENDER).map((row) => (
					<TableRowWithExpansion
						key={row.id}
						renderSubComponent={renderSubComponent}
						row={row}
					/>
				))}
			</TableBody>
		);
	}

	return (
		<>
			<tbody ref={anchorRef} aria-hidden />
			{topPadding > 0 && (
				<Spacer height={topPadding} columnsLength={columnsLength} />
			)}
			{items.map((item) => {
				const row = rows[item.index];
				// One <tbody> per row so the measured height covers the expansion too
				return (
					<tbody key={row.id} data-index={item.index} ref={measureElement}>
						<TableRowWithExpansion
							renderSubComponent={renderSubComponent}
							row={row}
						/>
					</tbody>
				);
			})}
			{bottomPadding > 0 && (
				<Spacer height={bottomPadding} columnsLength={columnsLength} />
			)}
		</>
	);
};

const Spacer = ({
	height,
	columnsLength,
}: {
	height: number;
	columnsLength: number;
}) => (
	<tbody aria-hidden>
		<tr>
			<td colSpan={columnsLength} style={{ height, padding: 0 }} />
		</tr>
	</tbody>
);

// Single Row

// Row objects are stable, so state-dependent reads go through a subscription
const TableRowWithExpansion = <TData extends RowData>({
	row,
	renderSubComponent,
}: {
	row: DataTableRow<TData>;
	renderSubComponent?: RenderSubComponent<TData>;
}) => (
	<Subscribe
		source={row.table.store}
		selector={(state) => ({
			isExpanded: state.expanded === true || !!state.expanded[row.id],
			columnVisibility: state.columnVisibility,
		})}
	>
		{({ isExpanded }) => {
			const visibleCells = row.getVisibleCells();
			return (
				<>
					<TableRow
						data-state={isExpanded ? "expanded" : undefined}
						className={cn(
							"data-[state=expanded]:bg-muted/40",
							renderSubComponent && "cursor-pointer",
						)}
						onClick={
							renderSubComponent
								? (event) => {
										// The row is a shortcut for the chevron, which stays the
										// keyboard-accessible control. Anything already clickable
										// keeps its own action.
										if (
											(event.target as HTMLElement).closest(
												"a, button, input, select, [role='button']",
											)
										) {
											return;
										}
										row.toggleExpanded();
									}
								: undefined
						}
					>
						{visibleCells.map((cell) => (
							<TableCell key={cell.id}>
								{isExpanded && isActionColumn(cell.column)
									? null
									: flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>

					{isExpanded && renderSubComponent && (
						<TableRow>
							<TableCell
								colSpan={visibleCells.length}
								className="p-0 whitespace-normal"
							>
								<div className="sticky left-0 w-[100cqi] p-2">
									{renderSubComponent(row)}
								</div>
							</TableCell>
						</TableRow>
					)}
				</>
			);
		}}
	</Subscribe>
);

export default DataTableRows;
