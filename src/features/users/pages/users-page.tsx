import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSession } from "@/common/auth/auth-client";
import { DataTable } from "@/common/components/data-table/data-table";
import { PageHeader } from "@/common/components/page-header";
import { useTitle } from "@/common/hooks/use-title";
import { describeRequestFailure } from "@/common/lib/request-error";
import { deleteUserFn, getUsersFn } from "@/features/users/api/users.functions";
import { createColumns } from "@/features/users/components/columns";
import {
	CreateUserCard,
	CreateUserDrawer,
} from "@/features/users/components/create-user-form";

export const usersQueryOptions = {
	queryKey: ["users"],
	queryFn: () => getUsersFn(),
};

export function UsersPage() {
	const queryClient = useQueryClient();
	const search = useSearch({ from: "/_app/users" });
	const navigate = useNavigate({ from: "/users" });
	const { data: users = [] } = useQuery(usersQueryOptions);
	useTitle(`Users (${users.length})`);
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
		onError: (error) =>
			toast.error("Failed to delete user", {
				description: describeRequestFailure(error),
			}),
	});

	const deletingId = deleteMutation.isPending
		? deleteMutation.variables
		: undefined;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
			<PageHeader
				title="Users"
				summary={[{ label: "accounts", value: users.length }]}
				actions={<CreateUserDrawer className="lg:hidden" />}
			/>
			<div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_350px]">
				<DataTable
					columns={createColumns(
						deleteMutation.mutate,
						firstUserId,
						currentUserId,
						deletingId,
					)}
					data={users}
					search={search}
					navigate={navigate}
					getRowId={(user) => user.id}
					searchPlaceholder="Search username…"
					emptyState="No users found."
				/>
				<div className="hidden self-start lg:block">
					<CreateUserCard />
				</div>
			</div>
		</div>
	);
}
