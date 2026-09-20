import { createFileRoute } from "@tanstack/react-router";
import {
	HostsPage,
	hostsQueryOptions,
	hostsSearchSchema,
} from "@/features/hosts/pages/hosts-page";

export const Route = createFileRoute("/_app/hosts")({
	validateSearch: hostsSearchSchema,
	loader: async ({ context }) => {
		await context.queryClient.query({
			...hostsQueryOptions,
			staleTime: "static",
		});
	},
	component: HostsPage,
});
