import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IPLinkBadge } from "@/components/users/ip-badge";
import type { DecisionWithHost } from "@/lib/decisions.functions";

function originVariant(origin: string) {
	switch (origin.toLowerCase()) {
		case "cscli":
			return "outline" as const;
		case "capi":
			return "secondary" as const;
		default:
			return "default" as const;
	}
}

function typeVariant(type: string) {
	switch (type.toLowerCase()) {
		case "ban":
			return "destructive" as const;
		case "captcha":
			return "secondary" as const;
		default:
			return "outline" as const;
	}
}

export function createColumns(
	onDelete: (id: number, collapse?: () => void) => void,
	deletingId: number | undefined,
): ColumnDef<DecisionWithHost>[] {
	return [
		{
			accessorKey: "hostIp",
			header: "IP",
			meta: { sortable: true, globalFilter: true, visibleByDefault: true },
			filterFn: "arrIncludesSome",
			cell: ({ row }) => {
				const ip = row.getValue<string>("hostIp");
				return <IPLinkBadge ip={ip} />;
			},
		},
		{
			accessorKey: "scenario",
			header: "Scenario",
			meta: {
				globalFilter: true,
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Scenario",
			},
			cell: ({ row }) => {
				const scenario = row.getValue<string>("scenario");
				const short = scenario.replace("crowdsecurity/", "");
				return (
					<span className="max-w-[200px] truncate block" title={scenario}>
						{short}
					</span>
				);
			},
		},
		{
			accessorKey: "type",
			header: "Type",
			size: 80,
			meta: { filterVariant: "select", visibleByDefault: true },
			filterFn: "arrIncludesSome",
			cell: ({ row }) => {
				const type = row.getValue<string>("type");
				return <Badge variant={typeVariant(type)}>{type}</Badge>;
			},
		},
		{
			accessorKey: "origin",
			header: "Origin",
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Origin",
				filterVariant: "select",
			},
			filterFn: "arrIncludesSome",
			cell: ({ row }) => {
				const origin = row.getValue<string>("origin");
				return <Badge variant={originVariant(origin)}>{origin}</Badge>;
			},
		},
		{
			id: "country",
			header: "Country",
			size: 80,
			accessorFn: (row) => row.host.country,
			meta: {
				sortable: true,
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Country",
				filterVariant: "select",
			},
			filterFn: "arrIncludesSome",
			cell: ({ row }) => row.getValue("country") ?? "-",
		},
		{
			id: "status",
			header: "Status",
			size: 80,
			accessorFn: (row) => (row.active ? "Active" : "Expired"),
			meta: { sortable: true, filterVariant: "select", visibleByDefault: true },
			filterFn: "arrIncludesSome",
			cell: ({ row }) => {
				const status = row.getValue<string>("status");
				return (
					<Badge variant={status === "Active" ? "destructive" : "secondary"}>
						{status}
					</Badge>
				);
			},
		},
		{
			id: "entries",
			header: "Details",
			accessorFn: (row) => {
				const all = new Set<string>();
				for (const a of row.alerts) {
					for (const e of a.entries) all.add(e);
				}
				return [...all];
			},
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Details",
			},
			cell: ({ row }) => {
				const entries = row.getValue<string[]>("entries");
				if (!entries.length)
					return <span className="text-muted-foreground">—</span>;
				const [first, ...rest] = entries;
				return (
					<span className="flex items-center gap-1.5 min-w-0">
						<span
							className="font-mono text-xs max-w-[160px] truncate"
							title={first}
						>
							{first}
						</span>
						{rest.length > 0 && (
							<span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted rounded px-1">
								+{rest.length}
							</span>
						)}
					</span>
				);
			},
		},
		{
			accessorKey: "duration",
			header: "Duration",
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Duration",
			},
			cell: ({ row }) =>
				row.original.active ? (
					row.getValue<string>("duration")
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			accessorKey: "expiresAt",
			header: "Expires",
			meta: {
				sortable: true,
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "Expires",
			},
			cell: ({ row }) => (
				<RelativeTime date={row.getValue<string>("expiresAt")} />
			),
		},
		{
			id: "delete",
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "",
			},
			cell: ({ row }) => {
				const decision = row.original;
				if (!decision.active) return null;
				const isDeleting = deletingId === decision.id;
				return (
					<Button
						variant="destructive"
						size="sm"
						disabled={isDeleting}
						onClick={() => onDelete(decision.id)}
					>
						{isDeleting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Trash2 className="size-4" />
						)}
						{isDeleting ? "Deleting…" : "Delete"}
					</Button>
				);
			},
		},
		{
			id: "viewInCrowdsec",
			meta: {
				visibleByDefault: { desktop: true, mobile: false },
				expandedLabel: "",
			},
			cell: ({ row }) => {
				const ip = row.original.hostIp;
				return (
					<Button
						variant="default"
						size="sm"
						onClick={() => {
							window.open(`https://app.crowdsec.net/cti/${ip}`, "_blank");
						}}
					>
						<ExternalLink className="mr-1" />
						View in CrowdSec
					</Button>
				);
			},
		},
	];
}
