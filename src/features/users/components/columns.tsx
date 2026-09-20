import { Trash2 } from "lucide-react";
import {
	LOCAL_EMAIL_DOMAIN,
	SETUP_EMAIL_DOMAIN,
} from "@/common/auth/email-domains";
import type { DataTableColumnDef } from "@/common/components/data-table/table-features";
import { RelativeTime } from "@/common/components/relative-dates";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { useIsMobile } from "@/common/hooks/use-mobile";
import type { UserRow } from "@/features/users/api/users.functions";

export function createColumns(
	onDelete: (id: string) => void,
	firstUserId: string,
	currentUserId: string,
	deletingId: string | undefined,
): DataTableColumnDef<UserRow>[] {
	return [
		{
			accessorKey: "displayUsername",
			header: "Username",
			meta: {
				sortable: true,
				filter: "text",
				globalFilter: true,
				card: "title",
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<span className="font-medium">
						{row.getValue("displayUsername") ??
							row.original.username ??
							row.original.name}
					</span>
					{row.original.id === firstUserId && (
						<Badge variant="secondary">Owner</Badge>
					)}
				</div>
			),
		},
		{
			id: "loginMethod",
			header: "Login",
			meta: { card: "badge" },
			cell: ({ row }) => {
				const providers = row.original.accounts.map((a) => a.providerId);
				return (
					<div className="flex flex-wrap gap-1">
						{providers.map((p) => (
							<Badge key={p} variant="outline">
								{p === "credential" ? "Password" : p === "oidc" ? "SSO" : p}
							</Badge>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: "email",
			header: "Email",
			meta: { filter: "text", globalFilter: true },
			cell: ({ row }) => {
				const email = row.getValue<string>("email");
				if (
					email.endsWith(SETUP_EMAIL_DOMAIN) ||
					email.endsWith(LOCAL_EMAIL_DOMAIN)
				) {
					return <span className="text-muted-foreground">-</span>;
				}
				return email;
			},
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			meta: { sortable: true, filter: "date" },
			cell: ({ row }) => (
				<RelativeTime date={row.getValue<string>("createdAt")} />
			),
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const isMobile = useIsMobile();
				if (
					row.original.id === firstUserId ||
					row.original.id === currentUserId
				)
					return null;
				const isDeleting = deletingId === row.original.id;
				return (
					<Button
						variant="destructive"
						icon={Trash2}
						iconPlacement="left"
						loading={isDeleting}
						onClick={() => onDelete(row.original.id)}
					>
						{isMobile ? "" : isDeleting ? "Deleting…" : "Delete"}
					</Button>
				);
			},
		},
	];
}
