import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { DataTable } from "@/common/components/data-table/data-table";
import { LiveIndicator } from "@/common/components/live-indicator";
import { PageHeader } from "@/common/components/page-header";
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
	const {
		data: hosts = [],
		refetch,
		dataUpdatedAt,
	} = useQuery(hostsQueryOptions);
	useTitle(`Hosts (${hosts.length})`);

	const status = useSSEConnection<HostWithCount[]>("/sse/hosts", (incoming) => {
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
	});

	const bannedNow = hosts.filter((h) => h._count.decisions > 0).length;
	const repeatOffenders = hosts.filter((h) => h.totalBans > 1).length;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
			<PageHeader
				title="Hosts"
				summary={[
					{ label: "banned now", value: bannedNow, highlight: true },
					{ label: "repeat offenders", value: repeatOffenders },
					{ label: "seen", value: hosts.length },
				]}
				actions={<LiveIndicator status={status} updatedAt={dataUpdatedAt} />}
			/>
			<DataTable
				columns={columns}
				data={hosts}
				search={search}
				navigate={navigate}
				getRowId={(host) => host.ip}
				searchPlaceholder="Search IP…"
				emptyState="No hosts discovered yet."
				renderSubComponent={(row) => <HostExpandedRow row={row} />}
				onRefresh={refetch}
			/>
		</div>
	);
}
