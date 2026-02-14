import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import DataDisplayToolbar from "@/components/data-table/data-display-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { createColumns } from "@/components/users/columns";
import { CreateUserForm } from "@/components/users/create-user-form";
import { deleteUserFn, getUsersFn } from "@/lib/users.functions";

const usersQueryOptions = {
	queryKey: ["users"],
	queryFn: () => getUsersFn(),
};

export const Route = createFileRoute("/_app/users")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(usersQueryOptions);
	},
	component: UsersPage,
});

function UsersPage() {
	const queryClient = useQueryClient();
	const { data: users = [] } = useQuery(usersQueryOptions);

	const firstUserId = users[0]?.id ?? "";

	const handleDelete = useCallback(
		async (id: string) => {
			const result = await deleteUserFn({ data: { id } });
			if ("error" in result && result.error) {
				return;
			}
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		[queryClient],
	);

	const handleCreated = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["users"] });
	}, [queryClient]);

	const columns = useMemo(
		() => createColumns(handleDelete, firstUserId),
		[handleDelete, firstUserId],
	);

	return (
		<div className="container mx-auto py-6 px-4">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight">Users</h1>
				<p className="text-muted-foreground">
					Manage dashboard users ({users.length})
				</p>
			</div>
			<div className="grid gap-6 lg:grid-cols-[1fr_350px]">
				<DataTable
					columns={columns}
					data={users}
					emptyState="No users found."
					header={(table) => (
						<DataDisplayToolbar
							table={table}
							searchPlaceholder="Filter by username…"
						/>
					)}
				/>
				<div className="self-start">
					<CreateUserForm onSuccess={handleCreated} />
				</div>
			</div>
		</div>
	);
}
