import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import DataDisplayToolbar from "@/components/data-table/data-display-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { createColumns } from "@/components/decisions/columns";
import { DecisionExpandedRow } from "@/components/decisions/decision-expanded-row";
import {
	DecisionOriginSchema,
	DecisionTypeSchema,
} from "@/generated/zod/schemas";
import { useSSEConnection } from "@/hooks/use-sse-connection";
import {
	type DecisionWithHost,
	deleteDecisionFn,
	getDecisionsFn,
} from "@/lib/decisions.functions";

const decisionsSearchSchema = z.object({
	hostIp: z.string().optional(),
	type: DecisionTypeSchema.optional(),
	origin: DecisionOriginSchema.optional(),
	active: z.boolean().optional(),
});

const decisionsQueryOptions = {
	queryKey: ["decisions"],
	queryFn: () => getDecisionsFn(),
	staleTime: Infinity,
};

export const Route = createFileRoute("/_app/decisions")({
	validateSearch: decisionsSearchSchema,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(decisionsQueryOptions);
	},
	component: DecisionsPage,
});

function DecisionsPage() {
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
				// Keep expired decisions, replace active portion
				const expired = (old ?? []).filter((d) => !d.active);
				return [...incoming, ...expired];
			});
		},
		[queryClient],
	);

	const connected = useSSEConnection<DecisionWithHost[]>(
		"/sse/decisions",
		handleDecisionsMessage,
	);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteDecisionFn({ data: { id } }),
		onError: (error, id) => {
			toast.error(`Failed to delete decision ${id}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const handleDelete = useCallback(
		(id: number, collapse?: () => void) => {
			deleteMutation.mutate(id, {
				onSuccess: () => {
					toast.success("Decision deleted", {
						description: `Decision ${id} removed from LAPI`,
					});
					collapse?.();
					queryClient.invalidateQueries({ queryKey: ["decisions"] });
				},
			});
		},
		[deleteMutation, queryClient],
	);

	const deletingId = deleteMutation.isPending
		? deleteMutation.variables
		: undefined;

	const columns = useMemo(
		() => createColumns(handleDelete, deletingId),
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
				renderSubComponent={(row) => (
					<DecisionExpandedRow
						row={row}
						onDelete={handleDelete}
						deletingId={deletingId}
					/>
				)}
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
