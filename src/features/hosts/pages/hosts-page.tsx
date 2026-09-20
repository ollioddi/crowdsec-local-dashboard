import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { DataTable } from "@/common/components/data-table/data-table";
import { LiveIndicator } from "@/common/components/live-indicator";
import { useSSEConnection } from "@/common/hooks/use-sse-connection";
import { useTitle } from "@/common/hooks/use-title";
import {
	getHostsFn,
	type HostWithCount,
} from "@/features/hosts/api/hosts.functions";
import { columns } from "@/features/hosts/components/columns";
import { HostExpandedRow } from "@/features/hosts/components/host-expanded-row";

export const hostsQueryOptions = {
	queryKey: ["hosts"],
	queryFn: () => getHostsFn(),
	staleTime: Infinity,
};

export function HostsPage() {
	const queryClient = useQueryClient();
	const search = useSearch({ from: "/_app/hosts" });
	const navigate = useNavigate({ from: "/hosts" });
	const { data: hosts = [] } = useQuery(hostsQueryOptions);
	useTitle(`Hosts (${hosts.length})`);

	const connected = useSSEConnection<HostWithCount[]>(
		"/sse/hosts",
		(incoming) => {
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
				search={search}
				navigate={navigate}
				getRowId={(host) => host.ip}
				searchPlaceholder="Search IP…"
				emptyState="No hosts discovered yet."
				renderSubComponent={(row) => <HostExpandedRow row={row} />}
				toolbarExtra={<LiveIndicator connected={connected} />}
			/>
		</div>
	);
}
