/* eslint-disable @typescript-eslint/no-unused-vars */

// This file is used to extend the types of the react-table library
import "@tanstack/react-table";

declare module "@tanstack/react-table" {
	interface ColumnMeta<_TData extends object, _TValue> {
		sortable?: boolean;
		filterable?: boolean;
		visibleByDefault?:
			| {
					desktop?: boolean;
					mobile?: boolean;
			  }
			| boolean;
		/** Include this column's value in the global text filter */
		globalFilter?: boolean;
		/** Human-readable label shown in the expanded mobile row */
		expandedLabel?: string;
		/** Shorter column header text used on mobile to avoid overflow */
		mobileHeader?: string;
		/** Column filter variant: 'select' for multi-select faceted filter */
		filterVariant?: "select";
	}

	interface TableMeta<TData extends object> {
		/** Optional function to calculate progress (0-100) for a row */
		getRowProgress?: (row: TData) => number | undefined;
	}
}
