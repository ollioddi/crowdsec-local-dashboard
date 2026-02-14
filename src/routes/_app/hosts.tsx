import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import z from "zod";
import DataDisplayToolbar from "@/components/data-table/data-display-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "@/components/hosts/columns";
import { HostExpandedRow } from "@/components/hosts/host-expanded-row";
import { useSSEConnection } from "@/hooks/use-sse-connection";
import { getHostsFn, type HostWithCount } from "@/lib/hosts.functions";

const hostSearchSchema = z.object({
	hostIp: z.string().optional(),
});

const hostsQueryOptions = {
	queryKey: ["hosts"],
	queryFn: () => getHostsFn(),
	staleTime: Infinity,
};

export const Route = createFileRoute("/_app/hosts")({
	validateSearch: hostSearchSchema,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(hostsQueryOptions);
	},
	component: HostsPage,
});

function HostsPage() {
	const queryClient = useQueryClient();
	const { hostIp } = useSearch({
		from: "/_app/hosts",
	});

	const { data: hosts = [] } = useQuery(hostsQueryOptions);

	const handleHostsMessage = useCallback(
		(incoming: HostWithCount[]) => {
			queryClient.setQueryData<HostWithCount[]>(["hosts"], (old) => {
				if (old) {
					const knownIps = new Set(old.map((h) => h.ip));
					for (const host of incoming) {
						if (!knownIps.has(host.ip)) {
							toast.success("New host discovered", { description: host.ip });
						}
					}
				}
				return incoming;
			});
		},
		[queryClient],
	);

	const connected = useSSEConnection<HostWithCount[]>(
		"/sse/hosts",
		handleHostsMessage,
	);

	return (
		<div className="container mx-auto py-6 px-4">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight">Hosts</h1>
				<p className="text-muted-foreground">
					Discovered hosts ({hosts.length})
				</p>
			</div>
			<DataTable
				columns={columns}
				data={hosts}
				initialSorting={[{ id: "activeDecisions", desc: true }]}
				initialGlobalFilter={hostIp}
				emptyState="No hosts discovered yet."
				mobileExpandedRow={(row) => <HostExpandedRow row={row} />}
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
