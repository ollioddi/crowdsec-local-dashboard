import { createFileRoute } from "@tanstack/react-router";
import { dataTableSearchSchema } from "@/common/components/data-table/search-schema";
import {
	HostsPage,
	hostsQueryOptions,
} from "@/features/hosts/pages/hosts-page";

export const Route = createFileRoute("/_app/hosts")({
	validateSearch: dataTableSearchSchema({
		sort: { field: "activeDecisions", order: "desc" },
	}),
	loader: async ({ context }) => {
		await context.queryClient.query({
			...hostsQueryOptions,
			staleTime: "static",
		});
	},
	component: HostsPage,
});
