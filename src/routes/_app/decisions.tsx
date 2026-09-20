import { createFileRoute } from "@tanstack/react-router";
import {
	DecisionsPage,
	decisionsQueryOptions,
	decisionsSearchSchema,
} from "@/features/decisions/pages/decisions-page";

export const Route = createFileRoute("/_app/decisions")({
	validateSearch: decisionsSearchSchema,
	loader: async ({ context }) => {
		await context.queryClient.query({
			...decisionsQueryOptions,
			staleTime: "static",
		});
	},
	component: DecisionsPage,
});
