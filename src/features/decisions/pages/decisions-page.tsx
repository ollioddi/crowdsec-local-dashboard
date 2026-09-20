import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { ColumnFiltersState, Row } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import DataDisplayToolbar from "@/common/components/data-table/data-display-toolbar";
import { DataTable } from "@/common/components/data-table/data-table";
import { useSSEConnection } from "@/common/hooks/use-sse-connection";
import {
	type DecisionWithHost,
	deleteDecisionFn,
	getDecisionsFn,
} from "@/features/decisions/api/decisions.functions";
import { createColumns } from "@/features/decisions/components/columns";
import { DecisionExpandedRow } from "@/features/decisions/components/decision-expanded-row";
import {
	DecisionOriginSchema,
	DecisionTypeSchema,
} from "@/generated/zod/schemas";

export const decisionsSearchSchema = z.object({
	hostIp: z.string().optional(),
	type: DecisionTypeSchema.optional(),
	origin: DecisionOriginSchema.optional(),
	active: z.boolean().optional(),
});

export const decisionsQueryOptions = {
	queryKey: ["decisions"],
	queryFn: () => getDecisionsFn(),
	staleTime: Infinity,
};

export function DecisionsPage() {
	const queryClient = useQueryClient();
	const { hostIp, type, origin, active } = useSearch({
		from: "/_app/decisions",
	});

	const { data: decisions = [] } = useQuery(decisionsQueryOptions);

	// Build initial column filters from URL search params
	const initialColumnFilters = useMemo<ColumnFiltersState>(() => {
		const filters: ColumnFiltersState = [];
		if (type) filters.push({ id: "type", value: [type] });
		if (origin) filters.push({ id: "origin", value: [origin] });
		if (active !== undefined)
			filters.push({ id: "status", value: [active ? "Active" : "Expired"] });
		return filters;
	}, [type, origin, active]);

	const handleDecisionsMessage = useCallback(
		(incoming: DecisionWithHost[]) => {
			queryClient.setQueryData<DecisionWithHost[]>(["decisions"], (old) => {
				const incomingIds = new Set(incoming.map((d) => d.id));
				if (old) {
					const knownIds = new Set(old.map((d) => d.id));
					for (const decision of incoming) {
						if (!knownIds.has(decision.id)) {
							toast.success("New decision", {
								description: `${decision.type} on ${decision.hostIp}`,
							});
						}
					}
				}
				// The server sends the active set; anything we knew as active that
				// is no longer in it has expired and moves to the inactive part.
				const inactive = (old ?? [])
					.filter((d) => !incomingIds.has(d.id))
					.map((d) => (d.active ? { ...d, active: false } : d));
				return [...incoming, ...inactive];
			});
		},
		[queryClient],
	);

	const connected = useSSEConnection<DecisionWithHost[]>(
		"/sse/decisions",
		handleDecisionsMessage,
	);

	const {
		mutate: deleteDecision,
		isPending,
		variables,
	} = useMutation({
		mutationFn: (id: number) => deleteDecisionFn({ data: { id } }),
		onSuccess: (result, id) => {
			// Update the row in place; the server broadcasts the new state too
			queryClient.setQueryData<DecisionWithHost[]>(["decisions"], (old) =>
				old?.map((d) =>
					d.id === id
						? { ...d, active: false, expiresAt: result.expiresAt }
						: d,
				),
			);
			toast.success("Decision deleted", {
				description: result.deleted
					? `Decision ${id} removed from LAPI`
					: `Decision ${id} had already expired`,
			});
		},
		onError: (error, id) => {
			toast.error(`Failed to delete decision ${id}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const handleDelete = useCallback(
		(id: number, collapse?: () => void) => {
			deleteDecision(id, { onSuccess: () => collapse?.() });
		},
		[deleteDecision],
	);

	const deletingId = isPending ? variables : undefined;

	const columns = useMemo(
		() => createColumns(handleDelete, deletingId),
		[handleDelete, deletingId],
	);

	const renderSubComponent = useCallback(
		(row: Row<DecisionWithHost>) => (
			<DecisionExpandedRow
				row={row}
				onDelete={handleDelete}
				deletingId={deletingId}
			/>
		),
		[handleDelete, deletingId],
	);

	return (
		<div className="container mx-auto py-6 px-4">
			<div className="mb-6">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold tracking-tight">Decisions</h1>
				</div>
				<p className="text-muted-foreground">{decisions.length} decisions</p>
			</div>
			<DataTable
				columns={columns}
				data={decisions}
				initialColumnFilters={initialColumnFilters}
				initialSorting={[{ id: "status", desc: false }]}
				initialGlobalFilter={hostIp}
				emptyState="No decisions."
				renderSubComponent={renderSubComponent}
				header={(table) => (
					<DataDisplayToolbar
						table={table}
						searchPlaceholder="Filter by IP…"
						extra={
							<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
								<span
									className={`inline-block size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
								/>
								{connected ? "Live" : "Disconnected"}
							</div>
						}
					/>
				)}
			/>
		</div>
	);
}
