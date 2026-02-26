import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	LOCAL_EMAIL_DOMAIN,
	SETUP_EMAIL_DOMAIN,
	type UserRow,
} from "@/lib/users.functions";

export function createColumns(
	onDelete: (id: string) => void,
	firstUserId: string,
): ColumnDef<UserRow>[] {
	return [
		{
			accessorKey: "displayUsername",
			header: "Username",
			meta: { sortable: true, globalFilter: true, visibleByDefault: true },
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<span className="font-medium">
						{row.getValue("displayUsername") ?? row.original.username}
					</span>
					{row.original.id === firstUserId && (
						<Badge variant="secondary">Admin</Badge>
					)}
				</div>
			),
		},
		{
			id: "loginMethod",
			header: "Login",
			meta: { visibleByDefault: true },
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
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Email",
				globalFilter: true,
			},
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
			meta: {
				sortable: true,
				visibleByDefault: true,
			},
			cell: ({ row }) => (
				<RelativeTime date={row.getValue<string>("createdAt")} />
			),
		},
		{
			id: "actions",
			meta: { visibleByDefault: true },
			cell: ({ row }) => {
				const isMobile = useIsMobile();
				if (row.original.id === firstUserId) return null;
				return (
					<Button
						variant="destructive"
						onClick={() => onDelete(row.original.id)}
					>
						<Trash2 className="size-4" />
						{isMobile ? "" : "Delete"}
					</Button>
				);
			},
		},
	];
}
