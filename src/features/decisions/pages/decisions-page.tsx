import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/common/components/data-table/data-table";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { LiveIndicator } from "@/common/components/live-indicator";
import { PageHeader } from "@/common/components/page-header";
import { useSSEConnection } from "@/common/hooks/use-sse-connection";
import { useTitle } from "@/common/hooks/use-title";
import {
	deleteDecisionFn,
	getDecisionsFn,
} from "@/features/decisions/api/decisions.functions";
import {
	type DecisionsPayload,
	type DecisionWithHost,
	joinDecisionHosts,
} from "@/features/decisions/api/decisions.types";
import { createColumns } from "@/features/decisions/components/columns";
import { DecisionExpandedRow } from "@/features/decisions/components/decision-expanded-row";
import { DeleteDecisionDialog } from "@/features/decisions/components/delete-decision-dialog";

export const decisionsQueryOptions = {
	queryKey: ["decisions"],
	queryFn: () => getDecisionsFn(),
	staleTime: Infinity,
};

export function DecisionsPage() {
	const queryClient = useQueryClient();
	const search = useSearch({ from: "/_app/decisions" });
	const navigate = useNavigate({ from: "/decisions" });
	const { data, dataUpdatedAt } = useQuery(decisionsQueryOptions);
	const [pendingDelete, setPendingDelete] = useState<DecisionWithHost | null>(
		null,
	);

	// Hosts arrive as a lookup; every row for an IP shares one host object
	const decisions = useMemo(() => joinDecisionHosts(data), [data]);
	useTitle(`Decisions (${decisions.length})`);

	const connected = useSSEConnection<DecisionsPayload>(
		"/sse/decisions",
		(incoming) => {
			queryClient.setQueryData<DecisionsPayload>(["decisions"], (old) => {
				const incomingIds = new Set(incoming.decisions.map((d) => d.id));
				if (old) {
					const knownIds = new Set(old.decisions.map((d) => d.id));
					for (const decision of incoming.decisions) {
						if (!knownIds.has(decision.id)) {
							toast.success("New decision", {
								description: `${decision.type} on ${decision.hostIp}`,
							});
						}
					}
				}
				// The server sends the active set; anything we knew as active that
				// is no longer in it has expired and moves to the inactive part.
				const inactive = (old?.decisions ?? [])
					.filter((d) => !incomingIds.has(d.id))
					.map((d) => (d.active ? { ...d, active: false } : d));
				return {
					decisions: [...incoming.decisions, ...inactive],
					hosts: { ...old?.hosts, ...incoming.hosts },
				};
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
			queryClient.setQueryData<DecisionsPayload>(
				["decisions"],
				(old) =>
					old && {
						...old,
						decisions: old.decisions.map((d) =>
							d.id === id
								? { ...d, active: false, expiresAt: result.expiresAt }
								: d,
						),
					},
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

	const deletingId = isPending ? variables : undefined;

	const activeCount = decisions.filter((d) => d.active).length;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
			<PageHeader
				title="Decisions"
				summary={[
					{ label: "active", value: activeCount, highlight: true },
					{ label: "total", value: decisions.length },
				]}
				actions={
					<LiveIndicator connected={connected} updatedAt={dataUpdatedAt} />
				}
			/>
			<DataTable
				columns={createColumns(setPendingDelete, deletingId)}
				data={decisions}
				search={search}
				navigate={navigate}
				getRowId={(decision) => String(decision.id)}
				searchPlaceholder="Search IP or scenario…"
				emptyState="No decisions."
				renderSubComponent={(row: DataTableRow<DecisionWithHost>) => (
					<DecisionExpandedRow
						row={row}
						onRequestDelete={setPendingDelete}
						deletingId={deletingId}
					/>
				)}
			/>
			<DeleteDecisionDialog
				decision={pendingDelete}
				onOpenChange={(open) => !open && setPendingDelete(null)}
				onConfirm={(decision) => {
					setPendingDelete(null);
					deleteDecision(decision.id);
				}}
			/>
		</div>
	);
}
