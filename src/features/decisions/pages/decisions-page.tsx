import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { DataTable } from "@/common/components/data-table/data-table";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { LiveIndicator } from "@/common/components/live-indicator";
import { useSSEConnection } from "@/common/hooks/use-sse-connection";
import { useTitle } from "@/common/hooks/use-title";
import {
	type DecisionWithHost,
	deleteDecisionFn,
	getDecisionsFn,
} from "@/features/decisions/api/decisions.functions";
import { createColumns } from "@/features/decisions/components/columns";
import { DecisionExpandedRow } from "@/features/decisions/components/decision-expanded-row";

export const decisionsQueryOptions = {
	queryKey: ["decisions"],
	queryFn: () => getDecisionsFn(),
	staleTime: Infinity,
};

export function DecisionsPage() {
	const queryClient = useQueryClient();
	const search = useSearch({ from: "/_app/decisions" });
	const navigate = useNavigate({ from: "/decisions" });
	const { data: decisions = [] } = useQuery(decisionsQueryOptions);
	useTitle(`Decisions (${decisions.length})`);

	const connected = useSSEConnection<DecisionWithHost[]>(
		"/sse/decisions",
		(incoming) => {
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

	const handleDelete = (id: number, collapse?: () => void) => {
		deleteDecision(id, { onSuccess: () => collapse?.() });
	};
	const deletingId = isPending ? variables : undefined;

	return (
		<div className="container mx-auto py-6 px-4">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight">Decisions</h1>
				<p className="text-muted-foreground">{decisions.length} decisions</p>
			</div>
			<DataTable
				columns={createColumns(handleDelete, deletingId)}
				data={decisions}
				search={search}
				navigate={navigate}
				getRowId={(decision) => String(decision.id)}
				searchPlaceholder="Search IP or scenario…"
				emptyState="No decisions."
				renderSubComponent={(row: DataTableRow<DecisionWithHost>) => (
					<DecisionExpandedRow
						row={row}
						onDelete={handleDelete}
						deletingId={deletingId}
					/>
				)}
				toolbarExtra={<LiveIndicator connected={connected} />}
			/>
		</div>
	);
}
