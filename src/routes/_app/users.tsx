import { createFileRoute } from "@tanstack/react-router";
import {
	UsersPage,
	usersQueryOptions,
} from "@/features/users/pages/users-page";

export const Route = createFileRoute("/_app/users")({
	loader: async ({ context }) => {
		await context.queryClient.query({
			...usersQueryOptions,
			staleTime: "static",
		});
	},
	component: UsersPage,
});
