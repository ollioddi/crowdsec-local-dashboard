import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
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
	onDelete: (id: number) => void,
): ColumnDef<DecisionWithHost>[] {
	return [
		{
			accessorKey: "hostIp",
			header: "IP",
			meta: { sortable: true, globalFilter: true },
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
				hideOnMobile: true,
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
			meta: { filterVariant: "select" },
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
				hideOnMobile: true,
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
				hideOnMobile: true,
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
			meta: { sortable: true, filterVariant: "select" },
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
			accessorKey: "duration",
			header: "Duration",
			meta: { hideOnMobile: true, expandedLabel: "Duration" },
		},
		{
			accessorKey: "expiresAt",
			header: "Expires",
			meta: { sortable: true, hideOnMobile: true, expandedLabel: "Expires" },
			cell: ({ row }) => (
				<RelativeTime date={row.getValue<string>("expiresAt")} />
			),
		},
		{
			id: "delete",
			meta: { hideOnMobile: true, expandedLabel: "" },
			cell: ({ row }) => {
				const decision = row.original;
				if (!decision.active) return null;
				return (
					<Button
						variant="destructive"
						size="sm"
						onClick={() => onDelete(decision.id)}
					>
						<Trash2 className="size-4" />
						Delete
					</Button>
				);
			},
		},
		{
			id: "viewInCrowdsec",
			meta: { hideOnMobile: true, expandedLabel: "" },
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
