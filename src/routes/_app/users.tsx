import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { Table } from "@tanstack/react-table";
import { useMemo } from "react";
import { toast } from "sonner";
import DataDisplayToolbar from "@/components/data-table/data-display-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { createColumns } from "@/components/users/columns";
import { CreateUserForm } from "@/components/users/create-user-form";
import { useSession } from "@/lib/auth/auth-client";
import type { UserRow } from "@/lib/users.functions";
import { deleteUserFn, getUsersFn } from "@/lib/users.functions";

function renderUsersTableHeader(table: Table<UserRow>) {
	return (
		<DataDisplayToolbar table={table} searchPlaceholder="Filter by username…" />
	);
}

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
	const { data: session } = useSession();

	const firstUserId = users[0]?.id ?? "";
	const currentUserId = session?.user.id ?? "";

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteUserFn({ data: { id } }),
		onSuccess: (result) => {
			if ("error" in result && result.error) {
				toast.error(result.error);
				return;
			}
			toast.success("User deleted");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: () => toast.error("Failed to delete user"),
	});

	const deletingId = deleteMutation.isPending
		? deleteMutation.variables
		: undefined;

	const columns = useMemo(
		() =>
			createColumns(
				deleteMutation.mutate,
				firstUserId,
				currentUserId,
				deletingId,
			),
		[deleteMutation.mutate, firstUserId, currentUserId, deletingId],
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
					header={renderUsersTableHeader}
				/>
				<div className="self-start">
					<CreateUserForm />
				</div>
			</div>
		</div>
	);
}
