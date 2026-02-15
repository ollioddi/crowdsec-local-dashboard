"use no memo";
import { useHydrated } from "@tanstack/react-router";
import {
	flexRender,
	type Table as ReactTableType,
	type Row,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ReactElement, ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

interface DataTableRowsProps<TData> {
	table: ReactTableType<TData>;
	isLoading: boolean;
	emptyState?: ReactNode;
	renderSubComponent?: (row: Row<TData>) => ReactElement;
}

const VIRTUALIZATION_THRESHOLD = 100;
const ESTIMATED_ROW_HEIGHT = 41;
const INITIAL_ROWS_TO_RENDER = 30;

const DataTableRows = <TData,>({
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

// ————————————————
// Virtualized Rows
// ————————————————

const VirtualizedRows = <TData,>({
	rows,
	hydrated,
	renderSubComponent,
}: {
	rows: Row<TData>[];
	hydrated: boolean;
	renderSubComponent?: (row: Row<TData>) => ReactElement;
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

// ————————————————
// Single Row Component
// ————————————————

const TableRowWithExpansion = <TData,>({
	row,
	renderSubComponent,
}: {
	row: Row<TData>;
	renderSubComponent?: (row: Row<TData>) => ReactElement;
}) => {
	const visibleCells = row.getVisibleCells();
	const isExpanded = row.getIsExpanded();

	return (
		<>
			<TableRow data-state={row.getIsSelected() && "selected"}>
				{visibleCells.map((cell) => (
					<TableCell key={cell.id}>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				))}
			</TableRow>

			{isExpanded && renderSubComponent && (
				<TableRow>
					<TableCell colSpan={visibleCells.length}>
						{renderSubComponent(row)}
					</TableCell>
				</TableRow>
			)}
		</>
	);
};

// ————————————————
// Helper Components
// ————————————————

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
