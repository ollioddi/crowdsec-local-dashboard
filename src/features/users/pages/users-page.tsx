import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useSession } from "@/common/auth/auth-client";
import DataDisplayToolbar from "@/common/components/data-table/data-display-toolbar";
import { DataTable } from "@/common/components/data-table/data-table";
import type { DataTableInstance } from "@/common/components/data-table/table-features";
import type { UserRow } from "@/features/users/api/users.functions";
import { deleteUserFn, getUsersFn } from "@/features/users/api/users.functions";
import { createColumns } from "@/features/users/components/columns";
import { CreateUserForm } from "@/features/users/components/create-user-form";

function renderUsersTableHeader(table: DataTableInstance<UserRow>) {
	return (
		<DataDisplayToolbar table={table} searchPlaceholder="Filter by username…" />
	);
}

export const usersQueryOptions = {
	queryKey: ["users"],
	queryFn: () => getUsersFn(),
};

export function UsersPage() {
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
