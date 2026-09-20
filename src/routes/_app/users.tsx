import { createFileRoute } from "@tanstack/react-router";
import { dataTableSearchSchema } from "@/common/components/data-table/search-schema";
import {
	UsersPage,
	usersQueryOptions,
} from "@/features/users/pages/users-page";

export const Route = createFileRoute("/_app/users")({
	validateSearch: dataTableSearchSchema(),
	loader: async ({ context }) => {
		await context.queryClient.query({
			...usersQueryOptions,
			staleTime: "static",
		});
	},
	component: UsersPage,
});
