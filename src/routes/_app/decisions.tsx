import { createFileRoute } from "@tanstack/react-router";
import { dataTableSearchSchema } from "@/common/components/data-table/search-schema";
import {
	DecisionsPage,
	decisionsQueryOptions,
} from "@/features/decisions/pages/decisions-page";

export const Route = createFileRoute("/_app/decisions")({
	validateSearch: dataTableSearchSchema({
		sort: { field: "status", order: "asc" },
	}),
	loader: async ({ context }) => {
		await context.queryClient.query({
			...decisionsQueryOptions,
			staleTime: "static",
		});
	},
	component: DecisionsPage,
});
