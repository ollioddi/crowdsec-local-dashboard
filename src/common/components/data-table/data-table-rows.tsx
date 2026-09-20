import { useHydrated } from "@tanstack/react-router";
import { flexRender, type RowData, Subscribe } from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ReactElement, ReactNode } from "react";
import { TableCell, TableRow } from "@/common/components/ui/table";
import type { DataTableInstance, DataTableRow } from "./table-features";

type RenderSubComponent<TData extends RowData> = (
	row: DataTableRow<TData>,
) => ReactElement;

interface DataTableRowsProps<TData extends RowData> {
	table: DataTableInstance<TData>;
	isLoading: boolean;
	emptyState?: ReactNode;
	renderSubComponent?: RenderSubComponent<TData>;
}

const VIRTUALIZATION_THRESHOLD = 100;
const ESTIMATED_ROW_HEIGHT = 41;
const INITIAL_ROWS_TO_RENDER = 30;

const DataTableRows = <TData extends RowData>({
	table,
	isLoading,
	emptyState,
	renderSubComponent,
}: Readonly<DataTableRowsProps<TData>>) => {
	const data = table.options.data;
	const columnsLength = table.getAllLeafColumns().length;
	const hydrated = useHydrated();

	if (isLoading) {
		return <SkeletonRows columnsLength={columnsLength} rowsCount={10} />;
	}

	if (data.length === 0) {
		return <EmptyRow columnsLength={columnsLength} emptyState={emptyState} />;
	}

	const rows = table.getRowModel().rows;
	const shouldVirtualize = rows.length > VIRTUALIZATION_THRESHOLD;

	// Non-virtualized rendering for small datasets
	if (!shouldVirtualize) {
		return (
			<>
				{rows.map((row) => (
					<TableRowWithExpansion
						key={row.id}
						renderSubComponent={renderSubComponent}
						row={row}
					/>
				))}
			</>
		);
	}

	// Virtualized rendering for large datasets
	return (
		<VirtualizedRows
			hydrated={hydrated}
			renderSubComponent={renderSubComponent}
			rows={rows}
		/>
	);
};

// Virtualized Rows

const VirtualizedRows = <TData extends RowData>({
	rows,
	hydrated,
	renderSubComponent,
}: {
	rows: DataTableRow<TData>[];
	hydrated: boolean;
	renderSubComponent?: RenderSubComponent<TData>;
}) => {
	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		enabled: hydrated,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		overscan: 15,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	// Before hydration or if virtualizer not ready, render initial rows
	if (!hydrated || virtualRows.length === 0) {
		return (
			<>
				{rows.slice(0, INITIAL_ROWS_TO_RENDER).map((row) => (
					<TableRowWithExpansion
						key={row.id}
						renderSubComponent={renderSubComponent}
						row={row}
					/>
				))}
			</>
		);
	}

	const topSpacerHeight = virtualRows[0]?.start ?? 0;
	const bottomSpacerHeight =
		virtualRows.length > 0
			? totalSize - (virtualRows.at(-1)?.end ?? totalSize)
			: 0;

	return (
		<>
			{topSpacerHeight > 0 && <tr style={{ height: topSpacerHeight }} />}

			{virtualRows.map((virtualRow) => {
				const row = rows[virtualRow.index];
				return (
					<TableRowWithExpansion
						key={row.id}
						renderSubComponent={renderSubComponent}
						row={row}
					/>
				);
			})}

			{bottomSpacerHeight > 0 && <tr style={{ height: bottomSpacerHeight }} />}
		</>
	);
};

// Single Row Component

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
					<TableRow>
						{visibleCells.map((cell) => (
							<TableCell key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
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

// Helper Components

const SkeletonRows = ({
	columnsLength,
	rowsCount,
}: {
	columnsLength: number;
	rowsCount: number;
}) => (
	<>
		{Array.from({ length: rowsCount }, (_, index) => (
			<TableRow className="group" key={`skeleton-row-${String(index)}`}>
				{Array.from({ length: columnsLength }, (_, cellIndex) => (
					<TableCell key={`skeleton-cell-${String(cellIndex)}`}>
						<div className="h-5 w-25 animate-pulse rounded-full bg-muted" />
					</TableCell>
				))}
			</TableRow>
		))}
	</>
);

const EmptyRow = ({
	columnsLength,
	emptyState,
}: {
	columnsLength: number;
	emptyState?: ReactNode;
}) => (
	<TableRow>
		<TableCell className="h-24 text-center" colSpan={columnsLength}>
			{emptyState ?? "No results."}
		</TableCell>
	</TableRow>
);

export default DataTableRows;
